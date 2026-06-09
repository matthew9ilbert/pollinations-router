const axios = require('axios');
const { createOpenAIResponse, handleProviderError } = require('../utils');

const COPILOT_BASE_URL = 'https://api.githubcopilot.com';

const AVAILABLE_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'o1',
  'o1-mini',
  'o3-mini',
  'claude-3.5-sonnet',
  'claude-3.7-sonnet',
  'gemini-2.0-flash-001',
];

async function chat({ messages, model, stream, res }) {
  const token = process.env.COPILOT_TOKEN;
  if (!token) {
    throw { status: 401, message: 'COPILOT_TOKEN is not configured' };
  }

  const selectedModel = model || 'gpt-4o';

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Copilot-Integration-Id': 'vscode-chat',
    'Editor-Version': 'vscode/1.95.0',
    'Editor-Plugin-Version': 'copilot-chat/0.22.4',
    'User-Agent': 'GitHubCopilotChat/0.22.4',
  };

  if (stream) {
    try {
      const response = await axios.post(
        `${COPILOT_BASE_URL}/chat/completions`,
        { messages, model: selectedModel, stream: true },
        { headers, responseType: 'stream', timeout: 60000 }
      );

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      response.data.pipe(res);
      return null;
    } catch (err) {
      const { status, message } = handleProviderError(err, 'copilot');
      throw { status, message };
    }
  }

  try {
    const response = await axios.post(
      `${COPILOT_BASE_URL}/chat/completions`,
      { messages, model: selectedModel, stream: false },
      { headers, timeout: 60000 }
    );

    return response.data;
  } catch (err) {
    const { status, message } = handleProviderError(err, 'copilot');
    throw { status, message };
  }
}

async function listModels() {
  return AVAILABLE_MODELS.map((id) => ({
    id,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'github-copilot',
  }));
}

module.exports = { chat, listModels };
