export interface ApiErrorResult {
  code?: string;
  kind: 'field' | 'upgrade' | 'toast';
  message: string;
  details?: any;
}

export const handleApiError = (err: any): ApiErrorResult => {
  // Default structure
  const result: ApiErrorResult = {
    code: err?.code,
    kind: 'toast',
    message: 'Ocorreu um erro. Tente novamente.',
    details: err?.details
  };

  if (!err) return result;

  switch (err.code) {
    case 'PLAN_LIMIT_REACHED':
      result.kind = 'upgrade';
      result.message = 'No plano gratuito, você pode ter no máximo 2 viagens ativas. Faça upgrade para criar mais.';
      break;

    case 'VALIDATION_ERROR':
      result.kind = 'field';
      result.message = err.message || 'Dados inválidos. Verifique os campos.';
      break;

    case 'UNAUTHORIZED':
      result.kind = 'toast';
      result.message = 'Você precisa estar logado para continuar.';
      break;

    case 'FORBIDDEN':
      result.kind = 'toast';
      result.message = 'Você não tem permissão para realizar esta ação.';
      break;

    case 'NOT_FOUND':
      result.kind = 'toast';
      result.message = 'Não encontrado. Atualize a página e tente novamente.';
      break;

    case 'INTERNAL_ERROR':
    default:
      result.kind = 'toast';
      result.message = 'Ocorreu um erro. Tente novamente.';
      break;
  }

  return result;
};