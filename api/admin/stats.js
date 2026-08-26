const { getSql } = require('../../lib/db');
const { isAuthenticated } = require('../../lib/auth');

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
    const [row] = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours')::int AS last24h,
        COUNT(*) FILTER (WHERE consent = 'agree')::int AS consent_agree,
        MAX(created_at) AS last_response_at
      FROM responses
    `;
    res.status(200).json({
      ok: true,
      totalResponses: row.total,
      last24h: row.last24h,
      consentAgree: row.consent_agree,
      lastResponseAt: row.last_response_at,
    });
  } catch (err) {
    console.error('[api/admin/stats] erro:', err);
    res.status(500).json({ ok: false, message: 'Erro ao buscar estatísticas' });
  }
};
