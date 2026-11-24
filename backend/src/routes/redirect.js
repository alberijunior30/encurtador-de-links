const express = require('express');

const MESSAGES = {
  linkNotFound: 'Link não encontrado',
};

// Só casa com o formato do código ([A-Za-z0-9]{6}); o resto cai no 404 geral.
const CODE_PATH = '/:code([A-Za-z0-9]{6})';

const router = express.Router();

router.get(CODE_PATH, (req, res) => {
  // Busca case-sensitive (colação BINARY do SQLite): aB3xK9 != AB3XK9.
  const link = req.app.locals.repos.links.findByCode(req.params.code);
  if (!link) {
    return res.status(404).json({ error: MESSAGES.linkNotFound });
  }
  // res.redirect aplica encodeurl: URLs ASCII saem idênticas, %XX é preservado
  // e caracteres não ASCII (ex.: acentos) viram percent-encoding UTF-8.
  return res.redirect(302, link.originalUrl);
});

module.exports = { router, MESSAGES };
