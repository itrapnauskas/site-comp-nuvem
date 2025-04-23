// netlify/functions/verify-evaluation-token.js
import { Netlify } from "@netlify/functions";
import jwt from 'jsonwebtoken';

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const token = event.queryStringParameters.token;

  if (!token) {
    return { statusCode: 400, body: "Token is required" };
  }

  try {
    const decoded = jwt.verify(token, Netlify.env.get("JWT_SECRET"));
    const { email } = decoded;

    // Retornar os dados do aluno para a página de avaliação
    return {
      statusCode: 200,
      body: JSON.stringify({ email: email }),
    };
  } catch (error) {
    console.error("Error verifying token:", error);
    return { statusCode: 401, body: "Invalid or expired token" };
  }
}