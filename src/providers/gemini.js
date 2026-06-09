const axios = require('axios');
const { createOpenAIResponse, handleProviderError } = require('../utils');

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

const AVAILABLE_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
];

function convertMessagesToGemini(messages) {
  const systemParts = [];
  const contents = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemParts.push({ text: msg.content });
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  return { systemParts, contents };
}

async function chat({ messages, model }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw { status: 401, message: 'GEMINI_API_KEY is not configured' };
  }

  const selectedModel = model || 'gemini-2.0-flash';
  const { systemParts, contents } = convertMessagesToGemini(messages);

  const requestBody = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  if (systemParts.length > 0) {
    requestBody.systemInstruction = { parts: systemParts };
  }

  try {
    const response = await axios.post(
      `${GEMINI_BASE_URL}/models/${selectedModel}:generateContent?key=${apiKey}`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      }
    );

    const candidate = response.data?.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text || '';
    const promptTokens = response.data?.usageMetadata?.promptTokenCount || 0;
    const completionTokens = response.data?.usageMetadata?.candidatesTokenCount || 0;

    return createOpenAIResponse({ content, model: selectedModel, promptTokens, completionTokens });
  } catch (err) {
    const { status, message } = handleProviderError(err, 'gemini');
    throw { status, message };
  }
}

async function listModels() {
  return AVAILABLE_MODELS.map((id) => ({
    id,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'google',
  }));
}

module.exports = { chat, listModels };
