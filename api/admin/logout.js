const { clearSessionCookieHeader } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, message: 'Método não permitido' });
    return;
  }
  res.setHeader('Set-Cookie', clearSessionCookieHeader());
  res.status(200).json({ ok: true });
};
