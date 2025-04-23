// netlify/functions/request-evaluation-link.js
import { Netlify } from "@netlify/functions";
import jwt from 'jsonwebtoken';

const MAX_EMAILS_PER_MINUTE = 3;
const MAX_EMAILS_PER_DAY = 6;

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { email } = JSON.parse(event.body);

  // 1. Validar o e-mail
  if (!email) {
    return { statusCode: 400, body: "Email is required" };
  }

  // 2. Verificar se o e-mail existe no banco de dados
  const aluno = await getAlunoByEmail(email);
  if (!aluno) {
    return { statusCode: 404, body: "Email not found" };
  }

  // 3. Implementar as limitações de envio de e-mails
  const now = Date.now();
  const lastMinuteKey = `lastMinute:${email}`;
  const lastDayKey = `lastDay:${email}`;

  // Verificar limite por minuto
  const lastMinuteCount = await getCount(lastMinuteKey);
  if (lastMinuteCount >= MAX_EMAILS_PER_MINUTE) {
    return { statusCode: 429, body: "Too many requests per minute" };
  }

  // Verificar limite por dia
  const lastDayCount = await getCount(lastDayKey);
  if (lastDayCount >= MAX_EMAILS_PER_DAY) {
    return { statusCode: 429, body: "Too many requests per day" };
  }

  // 4. Gerar o token único
  const token = jwt.sign(
    { email: email },
    Netlify.env.get("JWT_SECRET"),
    { expiresIn: "30m" } // Expira em 30 minutos
  );

  const evaluationLink = `${Netlify.env.get("URL")}/avaliacao360?token=${token}`;

  // 5. Enviar o e-mail (chamando a função send-evaluation-email)
  try {
    await sendEvaluationEmail(email, evaluationLink);

    // 6. Atualizar os contadores
    await incrementCount(lastMinuteKey);
    await incrementCount(lastDayKey);

    return { statusCode: 200, body: "Evaluation link sent successfully" };
  } catch (error) {
    console.error("Error sending evaluation email:", error);
    return { statusCode: 500, body: "Error sending evaluation email" };
  }
}

// Funções auxiliares (substitua com sua lógica do Firebase)
async function getAlunoByEmail(email) {
  // Implemente a lógica para buscar o aluno no Firebase pelo e-mail
  // Exemplo:
  const response = await fetch(`https://comp-nuvem-2025.firebaseio.com/alunos/${email}.json`);
  const data = await response.json();
  return data;
}

async function sendEvaluationEmail(email, evaluationLink) {
  // Chamar a função send-evaluation-email
  const response = await fetch(
    `${Netlify.env.get("URL")}/.netlify/functions/send-evaluation-email`,
    {
      method: "POST",
      body: JSON.stringify({ email: email, evaluationLink: evaluationLink }),
    }
  );

  if (!response.ok) {
    throw new Error(`Error calling send-evaluation-email: ${response.statusText}`);
  }
}

async function getCount(key) {
  // Implemente a lógica para buscar o contador no Netlify KV ou em outro sistema de armazenamento
  // Exemplo (usando Netlify KV - precisa configurar):
  // const { value } = await Netlify.kv.get(key);
  // return value || 0;
  return 0; // Substitua com a lógica real
}

async function incrementCount(key) {
  // Implemente a lógica para incrementar o contador no Netlify KV ou em outro sistema de armazenamento
  // Exemplo (usando Netlify KV - precisa configurar):
  // await Netlify.kv.set(key, (await getCount(key)) + 1, { ttl: 60 }); // TTL de 1 minuto para o contador por minuto
  // await Netlify.kv.set(key, (await getCount(key)) + 1, { ttl: 86400 }); // TTL de 1 dia para o contador por dia
  // Substitua com a lógica real
}