const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addOmnisendContact(toEmail) {
  try {
    const response = await fetch('https://api.omnisend.com/v3/contacts', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.OMNISEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identifiers: [
          {
            type: 'email',
            id: toEmail,
            channels: {
              email: {
                status: 'subscribed',
                statusDate: new Date().toISOString()
              }
            }
          }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Omnisend gaf een foutmelding:', response.status, text);
    }
  } catch (err) {
    // Een mislukte toevoeging aan Omnisend mag de inschrijving zelf niet laten mislukken
    console.error('Kon contact niet toevoegen aan Omnisend:', err);
  }
}

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

  await addOmnisendContact(normalizedEmail);

  return res.status(200).json({ ok: true });
};
