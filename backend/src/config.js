// Base pública dos links curtos. Sem barra no final.
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

module.exports = { BASE_URL };
