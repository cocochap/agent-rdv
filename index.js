require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const config = require('./config');

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

function buildSystemPrompt() {
  const b = config.business;
  const services = b.services
    .map(s => `- ${s.nom} : ${s.prix} (${s.duree})`)
    .join('\n');

  return `Tu es l'assistant virtuel de ${b.name}, un ${b.type}.
Réponds UNIQUEMENT en français, de façon courte et naturelle (2-3 phrases max).
Sois chaleureux, professionnel, orienté conversion.

INFOS BUSINESS :
- Adresse : ${b.address}
- Téléphone : ${b.phone}
- Horaires : ${b.horaires}

SERVICES & TARIFS :
${services}

RÈGLES :
1. Réponds aux questions sur les horaires, services, tarifs.
2. Demande quel service intéresse le client.
3. Propose la prise de RDV après 2 échanges.
4. Pour RDV, donne ce lien : ${b.rdv_link}
5. Ne parle jamais d'autre chose.`;
}

const sessions = {};

app.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!sessions[sessionId]) sessions[sessionId] = [];
  sessions[sessionId].push({ role: 'user', content: message });

  const history = sessions[sessionId].slice(-10);

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        ...history
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;
    sessions[sessionId].push({ role: 'assistant', content: reply });
    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: "Désolé, une erreur s'est produite. Appelez-nous directement !" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Agent RDV lancé sur http://localhost:${PORT}`));

