const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'session_id is required' });

  try {
    const session = await stripe.checkout.sessions.retrieve(id);

    if (session.payment_status !== 'paid') {
      return res.status(402).json({
        paid: false,
        error: 'Pagamento ainda nao confirmado.',
      });
    }

    let answers = {};
    try {
      answers = JSON.parse(session.metadata?.answers || '{}');
    } catch (e) {
      answers = {};
    }

    return res.status(200).json({
      paid: true,
      destination: session.metadata?.destination || '',
      answers,
      email: session.customer_email || '',
    });
  } catch (err) {
    console.error('Session error:', err);
    return res.status(500).json({ error: err.message });
  }
};