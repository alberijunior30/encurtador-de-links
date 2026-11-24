const { BASE_URL } = require('../config');

/** Monta a resposta de link do contrato (o shortUrl não fica no banco). */
function toLinkResponse(link) {
  return {
    id: link.id,
    code: link.code,
    shortUrl: `${BASE_URL}/${link.code}`,
    originalUrl: link.originalUrl,
    userId: link.userId,
    createdAt: link.createdAt,
  };
}

module.exports = { toLinkResponse };
