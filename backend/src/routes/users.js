const express = require('express');
const { validateCreateUser } = require('../validation/users');
const { MESSAGES: LINK_MESSAGES } = require('../validation/links');
const { toLinkResponse } = require('../presenters/links');

const router = express.Router();

const DIGITS_ONLY = /^[0-9]+$/;

/**
 * Converte o :id da rota em inteiro. Só aceita dígitos; zeros à esquerda são
 * aceitos ('01' -> 1). Fora do intervalo seguro do JS devolve null (nenhum id existe ali).
 */
function parseUserId(raw) {
  if (!DIGITS_ONLY.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

router.post('/', (req, res) => {
  const { error, value } = validateCreateUser(req.body);
  if (error) {
    return res.status(400).json({ error });
  }
  const user = req.app.locals.repos.users.create(value);
  return res.status(201).json(user);
});

router.get('/', (req, res) => {
  res.status(200).json(req.app.locals.repos.users.list());
});

router.get('/:id/links', (req, res) => {
  const { repos } = req.app.locals;
  const userId = parseUserId(req.params.id);

  // :id não numérico e usuário inexistente respondem igual (404, mesma mensagem).
  if (userId === null || !repos.users.findById(userId)) {
    return res.status(404).json({ error: LINK_MESSAGES.userNotFound });
  }

  return res.status(200).json(repos.links.listByUser(userId).map(toLinkResponse));
});

module.exports = router;
module.exports.parseUserId = parseUserId;
