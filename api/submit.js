const { getSql } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, message: 'Método não permitido' });
    return;
  }

  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    res.status(400).json({ ok: false, message: 'Corpo inválido' });
    return;
  }

  try {
    const sql = getSql();
    await sql`
      INSERT INTO responses (consent, payload)
      VALUES (${payload.consentimento || null}, ${JSON.stringify(payload)}::jsonb)
    `;
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[api/submit] erro ao salvar resposta:', err);
    res.status(500).json({ ok: false, message: 'Erro ao salvar resposta' });
  }
};
