const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Geef een geldig emailadres op.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { error } = await supabase
    .from('subscribers')
    .insert([{ email: normalizedEmail }]);

  if (error) {
    // Unieke constraint -> al ingeschreven
    if (error.code === '23505') {
      return res.status(200).json({ ok: true, message: 'Je staat al op de lijst.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Er ging iets mis. Probeer later opnieuw.' });
  }

  return res.status(200).json({ ok: true });
};
