const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, destination, answers } = req.body;

  if (!email) return res.status(400).json({ error: 'Email is required' });

  const BASE_URL = process.env.NEXT_PUBLIC_URL || 'https://World4IU.vercel.app';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `World4IU — Roteiro personalizado: ${destination || 'Destino'}`,
            description: 'Roteiro de viagem gerado por IA, dia a dia, com clima, restaurantes e dicas exclusivas.',
          },
          unit_amount: 1999,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: email,
      success_url: `${BASE_URL}/roteiro?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/`,
      metadata: {
        destination: destination || '',
        answers: JSON.stringify(answers || {}).substring(0, 500),
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message });
  }
};
