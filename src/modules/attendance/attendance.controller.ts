import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { MESSAGES } from '../../constants/messages';
import { handleApiError } from '../../utils/errorHandler';

export class AttendanceController {
  // 1. Listar todos os lançamentos de frequência dos cultos
  async listAttendance(req: Request, res: Response): Promise<void> {
    try {
      const records = await prisma.serviceAttendance.findMany({
        orderBy: { date: 'desc' },
        include: {
          createdBy: {
            select: { fullName: true }
          }
        }
      });
      res.json(records);
    } catch (error) {
      handleApiError(res, error, MESSAGES.ERRORS.ATTENDANCE_FETCH_FAILED);
    }
  }

  // 2. Lançar nova contagem de presença em um culto
  async createAttendance(req: Request, res: Response): Promise<void> {
    try {
      const { date, serviceName, attendanceCount, notes } = req.body;

      if (!serviceName || typeof serviceName !== 'string' || !serviceName.trim()) {
        res.status(400).json({ error: MESSAGES.ERRORS.ATTENDANCE_NAME_REQUIRED });
        return;
      }

      const countNumber = Number(attendanceCount);
      if (isNaN(countNumber) || countNumber < 0) {
        res.status(400).json({ error: MESSAGES.ERRORS.ATTENDANCE_COUNT_INVALID });
        return;
      }

      const serviceDate = date ? new Date(date) : new Date();

      const record = await prisma.serviceAttendance.create({
        data: {
          date: serviceDate,
          serviceName: serviceName.trim(),
          attendanceCount: Math.floor(countNumber),
          notes: notes && typeof notes === 'string' ? notes.trim() : null,
          createdById: req.user?.id || null
        },
        include: {
          createdBy: {
            select: { fullName: true }
          }
        }
      });

      res.status(201).json(record);
    } catch (error) {
      handleApiError(res, error, MESSAGES.ERRORS.ATTENDANCE_REGISTER_FAILED);
    }
  }

  // 3. Excluir lançamento de frequência
  async deleteAttendance(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.serviceAttendance.delete({
        where: { id: String(id) }
      });
      res.json({ message: MESSAGES.SUCCESS.ATTENDANCE_DELETED });
    } catch (error) {
      handleApiError(res, error, MESSAGES.ERRORS.ATTENDANCE_DELETE_FAILED);
    }
  }

  // 4. Métricas estatísticas da Liderança (Visitantes por dia/mês/ano/dia da semana + Público dos cultos)
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const now = new Date();
      const currentYear = req.query.year ? Number(req.query.year) : now.getFullYear();
      const currentMonth = req.query.month ? Number(req.query.month) - 1 : now.getMonth();

      const user = req.user;
      const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');
      const paramCongregationId = req.query.congregationId as string;

      let congregationFilter: any = {};
      if (isSuperAdmin) {
        if (paramCongregationId && paramCongregationId !== 'ALL') {
          congregationFilter.congregationId = paramCongregationId;
        }
      } else {
        if (user?.congregationId) {
          congregationFilter.congregationId = user.congregationId;
        }
      }

      // Buscar todos os visitantes para métricas temporais
      const visitors = await prisma.visitor.findMany({
        where: congregationFilter,
        select: {
          id: true,
          visitDate: true,
          status: true
        }
      });

      // Buscar todos os cultos lançados
      const attendances = await prisma.serviceAttendance.findMany({
        orderBy: { date: 'asc' }
      });

      // --- A. Métricas de Visitantes por Mês (Ano Atual) ---
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const visitorsByMonth = monthNames.map((name, index) => {
        const count = visitors.filter(v => {
          const d = new Date(v.visitDate);
          return d.getFullYear() === currentYear && d.getMonth() === index;
        }).length;
        return { label: name, monthIndex: index, count };
      });

      // --- B. Métricas de Visitantes por Dia da Semana ---
      const weekDayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const visitorsByDayOfWeek = weekDayNames.map((dayName, dayIndex) => {
        const count = visitors.filter(v => {
          const d = new Date(v.visitDate);
          return d.getDay() === dayIndex;
        }).length;
        return { day: dayName, dayIndex, count };
      });

      // --- C. Métricas de Visitantes por Ano ---
      const yearsMap = new Map<number, number>();
      visitors.forEach(v => {
        const year = new Date(v.visitDate).getFullYear();
        yearsMap.set(year, (yearsMap.get(year) || 0) + 1);
      });
      if (!yearsMap.has(currentYear)) yearsMap.set(currentYear, 0);

      const visitorsByYear = Array.from(yearsMap.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year - b.year);

      // --- D. Métricas por Tipo de Culto (Média e Total de Presença) ---
      const serviceTypeMap = new Map<string, { totalPeople: number; count: number }>();
      attendances.forEach(a => {
        const name = a.serviceName.trim();
        const current = serviceTypeMap.get(name) || { totalPeople: 0, count: 0 };
        serviceTypeMap.set(name, {
          totalPeople: current.totalPeople + a.attendanceCount,
          count: current.count + 1
        });
      });

      const serviceStats = Array.from(serviceTypeMap.entries()).map(([serviceName, data]) => ({
        serviceName,
        totalServices: data.count,
        totalPeople: data.totalPeople,
        avgPeople: Math.round(data.totalPeople / data.count)
      }));

      // Totais gerais
      const totalVisitors = visitors.length;
      const visitorsThisMonth = visitors.filter(v => {
        const d = new Date(v.visitDate);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }).length;

      const attendancesThisMonth = attendances.filter(a => {
        const d = new Date(a.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });

      const totalServicesRegistered = attendancesThisMonth.length;
      const totalAttendanceSum = attendancesThisMonth.reduce((acc, curr) => acc + curr.attendanceCount, 0);
      const overallAvgAttendance = totalServicesRegistered > 0
        ? Math.round(totalAttendanceSum / totalServicesRegistered)
        : 0;

      res.json({
        summary: {
          totalVisitors,
          visitorsThisMonth,
          totalServicesRegistered,
          overallAvgAttendance
        },
        visitorsByMonth,
        visitorsByDayOfWeek,
        visitorsByYear,
        serviceStats,
        recentAttendances: attendances.slice(-10)
      });
    } catch (error) {
      handleApiError(res, error, MESSAGES.ERRORS.ATTENDANCE_METRICS_FAILED);
    }
  }
}

export const attendanceController = new AttendanceController();
