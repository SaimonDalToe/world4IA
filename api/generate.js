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

  const prompt = `Crie um roteiro de viagem personalizado.

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

REGRAS CRITICAS:
1. Retorne APENAS JSON puro, sem blocos de codigo markdown, sem texto antes ou depois.
2. NAO use crases triplas (tres backticks seguidos) no inicio ou fim.
3. NAO escreva "json" ou qualquer rotulo antes do JSON.
4. Use aspas duplas para strings, nunca aspas simples.
5. Escape aspas dentro de strings com barra invertida.
6. Sem virgula apos o ultimo item de array ou objeto.
7. Texto curto e direto em cada campo.

ESTRUTURA EXATA do JSON:
{
  "destino": "Cidade, Pais",
  "resumo": "Resumo curto em 2 frases.",
  "dias": [
    {
      "numero": 1,
      "titulo": "Titulo curto do dia",
      "clima": "Clima e como se vestir.",
      "manha": {"horario": "9h-12h", "atividades": ["Atividade 1", "Atividade 2"]},
      "tarde": {"horario": "13h-17h", "atividades": ["Atividade 1", "Atividade 2"]},
      "noite": {"horario": "19h-23h", "atividades": ["Atividade 1", "Atividade 2"]},
      "gastronomia": [
        {"nome": "Restaurante", "tipo": "Tipo culinaria", "preco": "$$", "dica": "Dica curta"}
      ],
      "transporte": "Como se locomover.",
      "fotos": ["Local 1", "Local 2"],
      "orcamento": "US$ 80-120",
      "dica": "Dica do dia."
    }
  ],
  "orcamentoTotal": "US$ 500-700",
  "dicasGerais": ["Dica 1", "Dica 2", "Dica 3"]
}

Gere um objeto na array "dias" para cada dia da viagem. Use locais e restaurantes reais da cidade. Seja conciso para evitar JSON muito longo.`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = message.content[0]?.text || '';
    if (!raw) throw new Error('Resposta vazia da IA');

    // Limpa a resposta: remove blocos markdown ```json ... ```
    let jsonStr = raw.trim();

    // Remove ```json no início e ``` no final (variantes)
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/i, '');
    jsonStr = jsonStr.replace(/\n?```\s*$/i, '');
    jsonStr = jsonStr.trim();

    // Extrai apenas o objeto JSON (caso ainda haja texto sobrando)
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    // Tenta corrigir vírgulas finais (trailing commas) que quebram JSON
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

    let roteiro;
    try {
      roteiro = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Erro ao parsear JSON:', e.message);
      console.error('JSON tentado (primeiros 500 chars):', jsonStr.substring(0, 500));
      console.error('JSON tentado (ultimos 500 chars):', jsonStr.substring(Math.max(0, jsonStr.length - 500)));
      throw new Error('A IA retornou um formato invalido. Tente novamente.');
    }

    return res.status(200).json({ roteiro });
  } catch (err) {
    console.error('Generate error:', err);
    return res.status(500).json({ error: err.message });
  }
};
