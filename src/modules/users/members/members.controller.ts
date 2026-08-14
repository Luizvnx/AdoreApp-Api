import { Request, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import crypto from 'crypto';

export class MembersController {
  // Lista todos os membros com seus perfis e relacionamentos
  async listMembers(req: Request, res: Response) {
    try {
      const members = await prisma.user.findMany({
        where: {
          roles: {
            has: 'MEMBER'
          }
        },
        include: {
          memberProfile: true
        }
      });
      res.json(members);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao listar membros.' });
    }
  }

  // Atualiza as informações do membro
  async updateMember(req: Request, res: Response) {
    const id = req.params.id as string;
    const { fullName, phone, address, zipCode, neighborhood, birthDate, joinDate, baptismDate, ministries } = req.body;

    try {
      // 1. Atualizar o User
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          fullName,
          memberProfile: {
            upsert: {
              create: {
                phone,
                address,
                zipCode,
                neighborhood,
                birthDate: birthDate ? new Date(birthDate) : null,
                joinDate: joinDate ? new Date(joinDate) : null,
                baptismDate: baptismDate ? new Date(baptismDate) : null,
                ministries: ministries || []
              },
              update: {
                phone,
                address,
                zipCode,
                neighborhood,
                birthDate: birthDate ? new Date(birthDate) : null,
                joinDate: joinDate ? new Date(joinDate) : null,
                baptismDate: baptismDate ? new Date(baptismDate) : null,
                ministries: ministries || []
              }
            }
          }
        },
        include: {
          memberProfile: true
        }
      });

      res.json(updatedUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar membro.' });
    }
  }

  // Converte um Visitante em Membro
  async convertVisitorToMember(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;

    try {
      // 1. Buscar o visitante
      const visitor = await prisma.visitor.findUnique({
        where: { id }
      });

      if (!visitor) {
        res.status(404).json({ error: 'Visitante não encontrado.' });
        return;
      }

      if (visitor.status === 'MEMBRO') {
        res.status(400).json({ error: 'Este visitante já foi convertido em membro.' });
        return;
      }

      // 2. Definir e-mail e senha temporária
      const targetEmail = (visitor.email && visitor.email.trim()) 
        ? visitor.email.trim().toLowerCase() 
        : (visitor.phone ? `membro${visitor.phone.replace(/\D/g, '')}@igreja.com` : `membro${Date.now()}@igreja.com`);
      
      const existingUser = await prisma.user.findUnique({
        where: { email: targetEmail }
      });

      if (existingUser) {
        res.status(400).json({ error: `Já existe um usuário/membro cadastrado com o e-mail (${targetEmail}).` });
        return;
      }

      const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 chars

      // 3. Criar o User (Membro) e herdar informações do Visitante no Perfil
      const newMember = await prisma.user.create({
        data: {
          fullName: visitor.fullName,
          email: targetEmail,
          password: tempPassword,
          roles: ['MEMBER'],
          memberProfile: {
            create: {
              phone: visitor.phone,
              address: visitor.fullAddress,
              neighborhood: visitor.neighborhood,
              birthDate: visitor.birthDate,
              joinDate: new Date(),
              baptismDate: visitor.isBaptized ? visitor.visitDate : null,
            }
          }
        }
      });

      // 4. Atualizar o Visitante
      await prisma.visitor.update({
        where: { id },
        data: {
          status: 'MEMBRO',
          userId: newMember.id
        }
      });

      // MOCK: Simular envio de e-mail ao visitante
      console.log(`\n\n[MOCK EMAIL SERVICE] E-mail enviado para ${targetEmail}`);
      console.log(`Assunto: Bem-vindo(a) à Família Adoreh!`);
      console.log(`Corpo: Olá ${newMember.fullName}, aqui está sua senha temporária para acesso ao aplicativo: ${tempPassword}\n\n`);

      // 5. Retornar os dados gerados (inclusive informando que o e-mail foi enviado)
      res.json({
        message: 'Visitante convertido em Membro com sucesso. Um e-mail com a senha temporária foi enviado.',
        member: newMember,
        credentials: {
          email: targetEmail,
          password: tempPassword
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao converter visitante em membro.' });
    }
  }
}
