const { checkPassword, createSessionCookieHeader } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, message: 'Método não permitido' });
    return;
  }

  const { password } = req.body || {};

  let valid;
  try {
    valid = checkPassword(password);
  } catch (err) {
    console.error('[api/admin/login] erro de configuração:', err);
    res.status(500).json({ ok: false, message: 'Erro de configuração do servidor' });
    return;
  }

  if (!valid) {
    res.status(401).json({ ok: false, message: 'Senha incorreta.' });
    return;
  }

  res.setHeader('Set-Cookie', createSessionCookieHeader());
  res.status(200).json({ ok: true });
};
