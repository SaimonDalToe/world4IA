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

  const prompt = `Voce e um especialista em viagens. Crie um roteiro personalizado e detalhado.

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

IMPORTANTE: Retorne APENAS um JSON valido (sem texto antes ou depois, sem markdown, sem blocos de codigo). O JSON deve ter exatamente esta estrutura:

{
  "destino": "Nome da cidade, Pais",
  "resumo": "Breve resumo do destino em 2-3 frases.",
  "dias": [
    {
      "numero": 1,
      "titulo": "Titulo do dia (ex: Chegada e exploracao de Palermo)",
      "clima": "Clima esperado e como se vestir neste dia.",
      "manha": {
        "horario": "9h-12h30",
        "atividades": ["Atividade 1 com detalhes", "Atividade 2 com detalhes"]
      },
      "tarde": {
        "horario": "13h-17h",
        "atividades": ["Atividade 1", "Atividade 2"]
      },
      "noite": {
        "horario": "19h-23h",
        "atividades": ["Atividade 1", "Atividade 2"]
      },
      "gastronomia": [
        {"nome": "Nome do restaurante", "tipo": "Tipo de culinaria", "preco": "$$ ou $$$", "dica": "Dica especial"}
      ],
      "transporte": "Como se locomover neste dia (metro, taxi, caminhada, etc).",
      "fotos": ["Local 1 para fotos", "Local 2 para fotos"],
      "orcamento": "Estimativa em dolares para o dia (ex: US$ 80-120)",
      "dica": "Uma dica exclusiva e pratica para este dia."
    }
  ],
  "orcamentoTotal": "Estimativa total da viagem em dolares",
  "dicasGerais": ["Dica 1", "Dica 2", "Dica 3"]
}

Gere um dia para cada dia da duracao informada. Seja detalhado e use restaurantes e locais REAIS da cidade. Responda APENAS com o JSON, sem nenhum texto adicional.`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = message.content[0]?.text;
    if (!raw) throw new Error('Resposta vazia da IA');

    // Tenta extrair JSON mesmo se vier com texto extra
    let jsonStr = raw.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    let roteiro;
    try {
      roteiro = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Erro ao parsear JSON:', e.message);
      console.error('Resposta bruta:', raw);
      throw new Error('Formato de resposta invalido. Tente novamente.');
    }

    return res.status(200).json({ roteiro });
  } catch (err) {
    console.error('Generate error:', err);
    return res.status(500).json({ error: err.message });
  }
};
