const express = require('express');
const { validateCreateLink, MESSAGES } = require('../validation/links');
const { toLinkResponse } = require('../presenters/links');

const MAX_CODE_ATTEMPTS = 5;

const router = express.Router();

function isUniqueViolation(err) {
  return err && err.code === 'SQLITE_CONSTRAINT_UNIQUE';
}

router.post('/', (req, res) => {
  const { error, value } = validateCreateLink(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const { repos, generateCode } = req.app.locals;

  if (!repos.users.findById(value.userId)) {
    return res.status(404).json({ error: MESSAGES.userNotFound });
  }

  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt += 1) {
    try {
      const link = repos.links.create({
        code: generateCode(),
        originalUrl: value.url,
        userId: value.userId,
      });
      return res.status(201).json(toLinkResponse(link));
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }

  return res.status(500).json({ error: MESSAGES.codeGenerationFailed });
});

module.exports = { router, MAX_CODE_ATTEMPTS };
