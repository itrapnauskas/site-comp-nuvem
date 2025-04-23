// netlify/functions/send-evaluation-email.js
import { Netlify } from "@netlify/functions";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { email, evaluationLink } = JSON.parse(event.body);

  // Enviar e-mail usando Netlify Email Integration
  try {
    await sendEmail({
      from: "seuemail@example.com", // Seu e-mail verificado no Mailgun
      to: email,
      subject: "Convite para Avaliação 360°",
      template: "evaluation-invite",
      parameters: {
        evaluationLink: evaluationLink,
      },
    });

    return { statusCode: 200, body: "Evaluation email sent successfully" };
  } catch (error) {
    console.error("Error sending evaluation email:", error);
    return { statusCode: 500, body: "Error sending evaluation email" };
  }
}

async function sendEmail({ from, to, subject, template, parameters }) {
  const url = `${Netlify.env.get("URL")}/.netlify/functions/emails/${template}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "netlify-emails-secret": Netlify.env.get("NETLIFY_EMAILS_SECRET"),
    },
    body: JSON.stringify({ from, to, subject, parameters }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar e-mail: ${response.statusText}`);
  }
}