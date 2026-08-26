const { neon } = require('@neondatabase/serverless');

// Lazy init: process.env.DATABASE_URL só existe em runtime (Vercel Function),
// nunca no momento em que este módulo é importado/empacotado.
let _sql = null;

function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não configurada');
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

module.exports = { getSql };
