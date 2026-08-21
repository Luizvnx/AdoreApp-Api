# 🕊️ AdorehApp — API Backend

API RESTful de alta performance desenvolvida em **Node.js**, **Express**, **TypeScript** e **Prisma ORM**, voltada para a gestão de multi-congregações (Sede e Filiais), membros, visitantes, tesouraria e lideranças eclesiásticas.

---

## 🛠️ Tecnologias Utilizadas

- **Runtime:** Node.js (v20+)
- **Linguagem:** TypeScript
- **Framework:** Express.js
- **ORM:** Prisma ORM (v7 com adaptador `@prisma/adapter-pg`)
- **Banco de Dados:** PostgreSQL 16
- **Autenticação:** JWT com suporte a Cookie HttpOnly e Header Authorization
- **Segurança:** Bcrypt (Hash de senhas), Helmet, SQL Sanitizer, Rate Limiter e CORS dinâmico

---

## 🚀 Como Rodar o Backend Localmente

### Pré-requisitos
- Node.js (v20+) instalado
- Instância do PostgreSQL rodando (localmente ou via Railway/Supabase)

### 1. Instalar Dependências
```bash
cd AdoreApp-Api
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz da pasta `AdoreApp-Api`:
```env
DATABASE_URL="postgresql://postgres:suasenha@localhost:5432/adorehapp?schema=public"
PORT=3333
JWT_SECRET="suaChaveSecretaJWT2026"
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
```

### 3. Sincronizar o Banco de Dados (Prisma)
```bash
npx prisma db push
npx prisma generate
```

### 4. Iniciar o Servidor
```bash
npm run dev
```
O servidor iniciará em `http://localhost:3333`. Na primeira execução, o servidor executará automaticamente a garantia da congregação **"Sede Central (Matriz)"** e o usuário administrador inicial (`admin@adorehapp.com`).

---

## 🗄️ Modelo de Banco de Dados (Prisma Schema)

- **Congregation**: Congregações da igreja (Sede Principal e Filiais).
- **User**: Usuários e membros do sistema com `roles[]` e vínculo a `congregationId`.
- **Visitor**: Ficha de cadastro de visitantes.
- **ConnectionGroup**: Grupos de Conexão (Células).
- **MemberProfile**: Perfil detalhado de membresia.
- **Ministry**: Cargos e ministérios cadastrados.
- **ServiceAttendance**: Registro de presença e métricas de cultos.
- **FinancialAccount**: Caixas da tesouraria.
- **FinancialTransaction**: Lançamentos financeiros atômicos com `paymentMethod` (PIX, DINHEIRO, DEBITO, CREDITO, TRANSFERENCIA, OUTRO) e histórico de auditoria em `editHistory`.
- **FixedExpense**: Gastos fixos da igreja.

---

## ⚡ Endpoints Principais DA API (`/api`)

### Autenticação (`/api/auth`)
- `POST /api/auth/login` — Autenticação com Bcrypt e emissão de JWT.
- `GET /api/auth/me` — Dados do perfil e congregação do usuário logado.
- `POST /api/auth/logout` — Encerramento seguro de sessão.

### Multi-Congregações (`/api/congregations`)
- `GET /api/congregations` — Listar congregações.
- `POST /api/congregations` — Cadastrar nova filial (`SUPER_ADMIN`).
- `PUT /api/congregations/:id` — Atualizar dados ou definir como Sede (`SUPER_ADMIN`).
- `DELETE /api/congregations/:id` — Excluir filial (`SUPER_ADMIN`).
- `GET /api/congregations/dashboard-report` — Métricas consolidadas das igrejas.

### Tesouraria (`/api/finance`)
- `POST /api/finance/transactions` — Lançar transação atômica.
- `GET /api/finance/transactions` — Listar transações com filtros (Tipo, Período, Forma de Pagamento).
- `PUT /api/finance/transactions/:id` — Editar transação registrando histórico do operador.
- `GET /api/finance/dashboard` ou `/api/finance/metrics` — Dashboard financeiro com saldo consolidado e histórico de 6 meses.
- `POST /api/finance/fixed-expenses` — Cadastrar gasto fixo.
- `GET /api/finance/fixed-expenses` — Listar gastos fixos.

### Visitantes & Membros (`/api/visitors` & `/api/members`)
- `GET /api/visitors` / `POST /api/visitors` — Gestão de visitantes por congregação.
- `GET /api/members` / `PUT /api/members/:id` — Gestão de membros.
- `POST /api/members/convert-visitor/:id` — Converter visitante em membro com senha aleatória Bcrypt.

---

## 🔐 Segurança & Multi-Congregação

1. **Assinatura JWT com `congregationId`**: O Token assinado inclui o ID da congregação do usuário.
2. **Isolamento de Dados em Todos os Controllers**: Usuários comuns (tesoureiros, líderes de célula) são forçados pela API a consultar e cadastrar dados estritamente dentro da sua própria filial.
3. **Visão Global Pastoral**: Apenas usuários com a função `SUPER_ADMIN` podem alternar o parâmetro `congregationId` ou solicitar relatórios agregados `ALL`.

---

## 📦 Build e Compilação
```bash
npm run build
```
Compila o TypeScript (`tsc`) após regerar o Prisma Client.

---

## 📄 Licença
Este projeto é proprietário e de uso exclusivo da instituição. Todos os direitos reservados.