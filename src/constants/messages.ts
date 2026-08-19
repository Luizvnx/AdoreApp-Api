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
    MEMBER_CONVERSION_FAILED: 'Erro ao converter visitante em membro.',
    EMAIL_ALREADY_EXISTS: 'Já existe um usuário/membro cadastrado com este e-mail.',
    MEMBER_SELF_EDIT_ONLY: 'Acesso negado: Você só tem permissão para editar o seu próprio perfil.',

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
    ATTENDANCE_COUNT_INVALID: 'A quantidade de pessoas deve ser um número positivo.'
  },
  SUCCESS: {
    MINISTRY_DELETED: 'Cargo/ministério excluído com sucesso.',
    ATTENDANCE_DELETED: 'Lançamento de culto excluído com sucesso.'
  }
};
