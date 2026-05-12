const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { answers, destination } = req.body;
  if (!answers) return res.status(400).json({ error: 'Answers are required' });

  const {
    continente = '',
    pais = '',
    cidade = '',
    epoca = '',
    dias = '',
    estilo = '',
    companhia = '',
    interesses = [],
    ritmo = '',
    preferencias = [],
    alimentacao = [],
    hospedagem = '',
  } = answers;

  const prompt = `Voce e um especialista em viagens. Crie um roteiro de viagem personalizado e detalhado:

DESTINO: ${cidade || destination}, ${pais} (${continente})
EPOCA: ${epoca}
DURACAO: ${dias}
ESTILO: ${estilo}
VIAJANDO: ${companhia}
INTERESSES: ${Array.isArray(interesses) ? interesses.join(', ') : interesses}
RITMO: ${ritmo}
PREFERENCIAS: ${Array.isArray(preferencias) ? preferencias.join(', ') : preferencias}
ALIMENTACAO: ${Array.isArray(alimentacao) ? alimentacao.join(', ') : alimentacao}
HOSPEDAGEM: ${hospedagem}

Crie um roteiro completo em markdown com:
## Visao Geral
## Clima e Como se Vestir
## Roteiro Dia a Dia (com manha, tarde e noite para cada dia)
## Gastronomia (5 restaurantes reais)
## Melhores Pontos para Fotos
## Bairros e Transporte
## Orcamento Estimado em dolares
## Dicas Exclusivas`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const roteiro = message.content[0]?.text;
    if (!roteiro) throw new Error('Resposta vazia da IA');

    return res.status(200).json({ roteiro });
  } catch (err) {
    console.error('Generate error:', err);
    return res.status(500).json({ error: err.message });
  }
};
