const { getSql } = require('../../lib/db');
const { isAuthenticated } = require('../../lib/auth');

const MAX_ROWS = 500;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, message: 'Método não permitido' });
    return;
  }
  if (!isAuthenticated(req)) {
    res.status(401).json({ ok: false, message: 'Não autenticado' });
    return;
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, created_at, consent, payload
      FROM responses
      ORDER BY created_at DESC
      LIMIT ${MAX_ROWS}
    `;
    res.status(200).json({ ok: true, responses: rows });
  } catch (err) {
    console.error('[api/admin/responses] erro:', err);
    res.status(500).json({ ok: false, message: 'Erro ao buscar respostas' });
  }
};
