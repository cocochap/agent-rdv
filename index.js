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
  const equipe = b.equipe
    .map(e => `- ${e.nom} : ${e.specialite}`)
    .join('\n');

  return `Tu es l'assistant virtuel de ${b.name}, ${b.type}.
Réponds UNIQUEMENT en français, de façon courte et naturelle (2-3 phrases max).
Sois chaleureux, professionnel, élégant. Tu représentes un salon haut de gamme.

INFOS GÉNÉRALES :
- Adresse : ${b.address}
- Téléphone / WhatsApp : ${b.phone}
- Email : ${b.email}
- Horaires : ${b.horaires}
- Histoire : ${b.histoire}
- Ambiance : ${b.ambiance}
- Avis clients : ${b.avis}

ÉQUIPE :
${equipe}

SERVICES & TARIFS COMPLETS :
${services}

RÈGLES :
1. Dès le premier message, demande le prénom du client de façon naturelle.
2. Utilise son prénom dans chaque réponse suivante.
3. Réponds précisément aux questions sur horaires, services, tarifs, équipe, histoire, ambiance.
4. Si on demande un service spécifique, donne le prix et la durée exacte.
5. Pour le lissage brésilien, recommande Vanessa directement.
6. Détecte l'intention : si le client mentionne un service, propose directement le tarif + le coiffeur expert + le lien RDV.
7. Propose la prise de RDV après 2 échanges maximum.
8. Pour RDV, donne ce lien : ${b.rdv_link}
9. Après avoir donné le lien RDV, ajoute toujours : "Si vous avez d'autres questions avant votre rendez-vous, je suis là 😊"
10. Pour toute question hors sujet, redirige vers le salon.
11. Ne parle jamais d'autre chose que du salon.`;
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
      max_tokens: 250,
      temperature: 0.7
    });

    const reply = completion.choices[0].message.content;
    sessions[sessionId].push({ role: 'assistant', content: reply });
    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: "Désolé, une erreur s'est produite. Appelez-nous au 07 55 55 10 00 !" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Agent RDV lancé sur http://localhost:${PORT}`));
