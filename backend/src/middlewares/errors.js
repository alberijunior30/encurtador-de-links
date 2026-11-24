// Toda resposta de erro segue o contrato: { "error": "mensagem" }

// Mensagens em português para os erros conhecidos do body-parser (express.json()).
const BODY_PARSER_MESSAGES = {
  'entity.parse.failed': 'JSON malformado na requisição',
  'entity.too.large': 'Corpo da requisição grande demais',
  'charset.unsupported': 'Charset não suportado; use utf-8',
  'encoding.unsupported': 'Codificação de conteúdo não suportada',
  'request.aborted': 'Requisição interrompida pelo cliente',
  'request.size.invalid': 'Tamanho do corpo diferente do Content-Length informado',
  'parameters.too.many': 'Parâmetros demais na requisição',
  'entity.verify.failed': 'Falha na verificação do corpo da requisição',
};

// Fallback por status, para nenhum 4xx sair com mensagem em inglês.
const STATUS_MESSAGES = {
  400: 'Requisição inválida',
  403: 'Acesso negado',
  404: 'Recurso não encontrado',
  405: 'Método não permitido',
  413: 'Corpo da requisição grande demais',
  415: 'Tipo de conteúdo não suportado',
};

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Rota não encontrada' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode;

  if (Number.isInteger(status) && status >= 400 && status < 500) {
    const message = BODY_PARSER_MESSAGES[err.type] || STATUS_MESSAGES[status] || 'Requisição inválida';
    return res.status(status).json({ error: message });
  }

  console.error(err);
  return res.status(500).json({ error: 'Erro interno do servidor' });
}

module.exports = { notFoundHandler, errorHandler, BODY_PARSER_MESSAGES };
