# 🕊️ AdorehApp — API Backend

API RESTful desenvolvida em **Node.js**, **Express**, **TypeScript** e **Prisma ORM**, voltada para o gerenciamento de membros, visitantes e lideranças eclesiásticas.

---

## 🛠️ Tecnologias Utilizadas

- **Runtime:** Node.js (v22+)
- **Linguagem:** TypeScript
- **Framework:** Express.js
- **ORM:** Prisma (v7 com driver `pg` / `@prisma/adapter-pg`)
- **Banco de Dados:** PostgreSQL 16
- **Execução & Hot-Reload:** `tsx watch`
- **Ambiente de Containers:** Docker / Docker Compose

---

## 🚀 Como Rodar o Backend Localmente

### Pré-requisitos
- Node.js (v20+) instalado
- Docker Desktop instalado e em execução (para banco de dados local)

### 1. Clonar e Instalar Dependências
```bash
cd api-adorehApp
npm install

### 2. Configurar Variáveis de Ambiente
Crie um arquivo chamado .env na raiz da pasta api-adorehApp e adicione:
```
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/adorehapp?schema=public"
PORT=3333

### 3. Sincronizar o Banco de Dados
Execute o comando para criar as tabelas com base no schema definido em prisma/schema.prisma:

Copiar código
npx prisma db push

### 4. Iniciar o Servidor em Modo de Desenvolvimento
```bash
npm run dev
```
O servidor iniciará em `http://localhost:3333` e recarregará automaticamente a cada alteração no código.

---

## 🏗️ Estrutura do Projeto
```
api-adorehApp/
├── src/
│   ├── server.ts         # Inicialização do servidor e configuração do Express
│   ├── routes/             # Rotas da API (visitors, members, users, etc.)
│   ├── config/           # Configurações (database, cors, etc.)
│   ├── controllers/        # Lógica de negócio das rotas
│   └── middlewares/      # Middlewares customizados (auth, error handling)
├── prisma/
│   ├── schema.prisma       # Definição do modelo de dados
│   └── client.ts         # Instância do cliente Prisma
├── .env                    # Variáveis de ambiente (credenciais, portas)
├── package.json            # Dependências e scripts
└── tsconfig.json           # Configuração do TypeScript
```

---

## 🗄️ Modelo de Banco de Dados (Resumo)

O schema define as seguintes coleções principais:

- **Member:** Membros da igreja
- **Visitor:** Visitantes
- **MemberFamily:** Relações familiares
- **User:** Usuários do sistema (administradores e pastores)
- **Log:** Trilha de auditoria
- **VisitorLog:** Logs específicos de visitantes

---

## ⚡ Endpoints Principais

O servidor expõe as seguintes rotas:

### Health
- `GET /health` — Status da aplicação e conexão com o banco

### Visitors
- `GET /api/visitors` — Listar todos os visitantes
- `POST /api/visitors` — Criar novo visitante
- `GET /api/visitors/:id` — Buscar visitante por ID
- `PATCH /api/visitors/:id` — Atualizar visitante
- `DELETE /api/visitors/:id` — Remover visitante

### Members
- `GET /api/members` — Listar todos os membros
- `POST /api/members` — Criar novo membro
- `GET /api/members/:id` — Buscar membro por ID
- `PATCH /api/members/:id` — Atualizar membro
- `DELETE /api/members/:id` — Remover membro

### Users (Admin/Pastor)
- `POST /api/users/login` — Login de usuários
- `GET /api/users/me` — Dados do usuário logado

### Reports
- `GET /api/reports/monthly-visitors` — Relatório de visitantes por mês
- `GET /api/reports/new-members-this-month` — Novos membros do mês

---

## 🔐 Autenticação e Autorização

A API implementa um sistema de autenticação baseado em JWT (JSON Web Tokens).

- **Roles Suportadas:**
  - `SUPER_ADMIN` — Acesso total
  - `ADMIN_WELCOME` — Acesso ao módulo de acolhimento
  - `PASTOR` — Acesso pastoral

---

## 🧪 Testes

Para testar a aplicação localmente:
1. Certifique-se de que o PostgreSQL está rodando e o banco está sincronizado (`npx prisma db push`).
2. Rode `npm run dev`.
3. Utilize ferramentas como Postman, Insomnia ou Thunder Client para enviar requisições:
   - **POST** `/api/users/login` — Obter token
   - **GET** `/api/visitors` — Listar visitantes
   - **POST** `/api/visitors` — Criar visitante

---

## 📦 Deploy

### Docker
Para containerizar a aplicação:
1. Crie um `Dockerfile` na raiz do projeto (exemplo básico):
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
EXPOSE 3333
CMD ["npm", "run", "dev"]
```
2. Rode: `docker build . -t api-adorehapp`
3. Inicie: `docker run -p 3333:3333 -e DATABASE_URL="..." api-adorehapp`

### Cloud (Railway / Supabase / Neon)
1. Configure as variáveis de ambiente na plataforma:
   - `DATABASE_URL`
   - `PORT`
2. Conecte o repositório à plataforma para deploy automático.

---

## 📄 Licença

Este projeto é proprietário. Todos os direitos reservados. Consulte o arquivo `LICENSE` para mais informações.

---

## 🤝 Contribuindo

Este projeto é de uso exclusivo para a igreja. O acesso, cópia ou distribuição não autorizados são estritamente proibidos.

---

## 📞 Suporte

Para dúvidas ou suporte técnico, entre em contato com a equipe de desenvolvimento.