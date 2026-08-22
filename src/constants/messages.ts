export const MESSAGES = {
  ERRORS: {
    // Auth
    UNAUTHORIZED: 'Sessão expirada ou token inválido. Por favor, faça login novamente.',
    ACCESS_DENIED: 'Acesso negado. Token de autenticação ausente ou inválido.',
    INVALID_TOKEN: 'Token de autenticação inválido ou corrompido.',
    INSUFFICIENT_PERMISSIONS: 'Acesso negado: Sem permissão suficiente para esta ação.',
    INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
    ACCOUNT_DISABLED: 'Esta conta de usuário foi desativada.',
    USER_NOT_FOUND: 'Usuário não encontrado ou inativo.',
    FETCH_PROFILE_FAILED: 'Erro ao resgatar perfil.',

    // Validation & Routing
    ROUTE_NOT_FOUND: 'Rota não encontrada.',
    INTERNAL_SERVER_ERROR: 'Erro interno no servidor.',
    INVALID_DATA: 'Entrada de dados inválida.',
    INVALID_SEARCH_PARAMS: 'Parâmetros de busca inválidos ou suspeitos.',
    INVALID_ROUTE_ID: 'Identificador de rota inválido.',
    INVALID_REQUEST_FORMAT: 'Formato de requisição inválido.',
    REQUIRED_FIELDS: 'Preencha todos os campos obrigatórios.',
    INVALID_ID: 'ID é obrigatório.',

    // Visitors
    VISITOR_NOT_FOUND: 'Visitante não encontrado.',
    VISITOR_REGISTER_FAILED: 'Falha ao cadastrar visitante.',
    VISITOR_FETCH_FAILED: 'Falha ao buscar visitantes.',
    VISITOR_UPDATE_FAILED: 'Falha ao atualizar visitante.',
    VISITOR_DELETE_FAILED: 'Falha ao remover visitante.',
    VISITOR_ALREADY_MEMBER: 'Este visitante já foi convertido em membro.',

    // Members
    MEMBER_NOT_FOUND: 'Membro não encontrado.',
    MEMBER_FETCH_FAILED: 'Erro ao listar membros.',
    MEMBER_UPDATE_FAILED: 'Erro ao atualizar membro.',
    MEMBER_CREATE_FAILED: 'Erro ao cadastrar novo membro.',
    MEMBER_DELETE_FAILED: 'Erro ao excluir membro do banco de dados.',
    MEMBER_CONVERSION_FAILED: 'Erro ao converter visitante em membro.',
    MEMBER_FULLNAME_REQUIRED: 'O nome completo do membro é obrigatório.',
    EMAIL_ALREADY_EXISTS: 'Já existe um usuário/membro cadastrado com este e-mail.',
    MEMBER_SELF_EDIT_ONLY: 'Acesso negado: Você só tem permissão para editar o seu próprio perfil.',
    MEMBER_EDIT_FORBIDDEN: 'Acesso negado: Você só pode editar membros da sua própria filial.',
    MEMBER_DELETE_FORBIDDEN: 'Acesso negado: Apenas administradores, pastores e diretoria podem excluir membros.',
    MEMBER_DELETE_CONGREGATION_FORBIDDEN: 'Acesso negado: Você só pode excluir membros da sua própria filial.',
    MEMBER_SELF_DELETE_PROHIBITED: 'Você não pode excluir sua própria conta.',

    // Ministries & Roles
    MINISTRY_NOT_FOUND: 'Cargo/ministério não encontrado.',
    MINISTRY_FETCH_FAILED: 'Erro ao listar cargos e ministérios.',
    MINISTRY_CREATE_FAILED: 'Erro ao criar cargo ou ministério.',
    MINISTRY_DELETE_FAILED: 'Erro ao excluir cargo ou ministério.',
    MINISTRY_ALREADY_EXISTS: 'Este cargo já está cadastrado.',
    MINISTRY_NAME_REQUIRED: 'O nome do cargo/ministério é obrigatório.',

    // Attendance
    ATTENDANCE_NOT_FOUND: 'Lançamento de culto não encontrado.',
    ATTENDANCE_FETCH_FAILED: 'Erro ao listar frequências dos cultos.',
    ATTENDANCE_REGISTER_FAILED: 'Erro ao registrar frequência do culto.',
    ATTENDANCE_DELETE_FAILED: 'Erro ao excluir lançamento de culto.',
    ATTENDANCE_METRICS_FAILED: 'Erro ao calcular métricas da igreja.',
    ATTENDANCE_NAME_REQUIRED: 'O nome do culto é obrigatório.',
    ATTENDANCE_COUNT_INVALID: 'A quantidade de pessoas deve ser um número positivo.',

    // Finance
    FINANCE_REQUIRED_FIELDS: 'Campos obrigatórios: title, type, amount, date, category.',
    FINANCE_INVALID_AMOUNT: 'O valor da transação deve ser maior que zero.',
    FINANCE_CREATE_FAILED: 'Erro ao cadastrar transação.',
    FINANCE_NOT_FOUND: 'Transação financeira não encontrada.',
    FINANCE_EDIT_FORBIDDEN: 'Você não tem permissão para editar transações de outra filial.',
    FINANCE_DELETE_FORBIDDEN: 'Você não tem permissão para excluir transações de outra filial.',
    FINANCE_UPDATE_FAILED: 'Erro ao editar transação.',
    FINANCE_LIST_FAILED: 'Erro ao listar transações.',
    FINANCE_DELETE_FAILED: 'Erro ao excluir transação.',
    FINANCE_FIXED_REQUIRED_FIELDS: 'Campos obrigatórios: title, amount, dueDate.',
    FIXED_EXPENSE_CREATE_FAILED: 'Erro ao cadastrar gasto fixo.',
    FIXED_EXPENSE_LIST_FAILED: 'Erro ao listar gastos fixos.',
    FIXED_EXPENSE_DELETE_FAILED: 'Erro ao excluir gasto fixo.',
    FINANCE_DASHBOARD_METRICS_FAILED: 'Erro ao carregar dashboard financeiro.',

    // Congregations
    CONGREGATION_NOT_FOUND: 'Congregação não encontrada.',
    CONGREGATION_LIST_FAILED: 'Erro ao listar congregações.',
    CONGREGATION_FETCH_FAILED: 'Erro ao buscar dados da congregação.',
    CONGREGATION_CREATE_FAILED: 'Erro ao cadastrar congregação.',
    CONGREGATION_UPDATE_FAILED: 'Erro ao atualizar congregação.',
    CONGREGATION_DELETE_FAILED: 'Erro ao excluir congregação.',
    CONGREGATION_DASHBOARD_FAILED: 'Erro ao gerar relatório de dashboard.',

    // WhatsApp
    WHATSAPP_STATUS_FAILED: 'Erro ao verificar status do WhatsApp.',
    WHATSAPP_QRCODE_FAILED: 'Erro ao gerar QR Code do WhatsApp.',
    WHATSAPP_DISCONNECT_FAILED: 'Erro ao desconectar WhatsApp.',
    WHATSAPP_READ_TEMPLATE_FAILED: 'Erro ao ler modelo de mensagem.',
    WHATSAPP_INVALID_TEMPLATE: 'Conteúdo da mensagem inválido.',
    WHATSAPP_SAVE_TEMPLATE_FAILED: 'Erro ao salvar modelo de mensagem.',
    WHATSAPP_TEST_REQUIRED: 'Telefone e mensagem são obrigatórios.',
    WHATSAPP_TEST_FAILED: 'Erro ao enviar mensagem de teste.'
  },
  SUCCESS: {
    LOGIN: 'Login realizado com sucesso.',
    LOGOUT: 'Sessão encerrada com sucesso.',
    MINISTRY_DELETED: 'Cargo/ministério excluído com sucesso.',
    ATTENDANCE_DELETED: 'Lançamento de culto excluído com sucesso.',
    TRANSACTION_DELETED: 'Transação excluída com sucesso.',
    FIXED_EXPENSE_DELETED: 'Gasto fixo excluído com sucesso.'
  }
};
