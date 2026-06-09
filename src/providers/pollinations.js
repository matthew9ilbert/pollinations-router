const axios = require('axios');
const { createOpenAIResponse, handleProviderError } = require('../utils');

const BASE_URL = process.env.POLLINATIONS_BASE_URL || 'https://text.pollinations.ai';

const AVAILABLE_MODELS = [
  'openai',
  'openai-large',
  'openai-reasoning',
  'qwen-coder',
  'llama',
  'mistral',
  'unity',
  'midijourney',
  'rtist',
  'searchgpt',
  'evil',
  'deepseek',
  'deepseek-r1',
  'claude-hybridspace',
  'gemini',
  'gemini-thinking',
  'hormoz',
  'hypnosis-tracy',
  'sur',
  'sur-mistral',
  'phi',
];

async function chat({ messages, model, stream, res }) {
  const selectedModel = model || 'openai';

  if (stream) {
    try {
      const response = await axios.post(
        `${BASE_URL}/openai/chat/completions`,
        { messages, model: selectedModel, stream: true },
        {
          headers: { 'Content-Type': 'application/json' },
          responseType: 'stream',
          timeout: 60000,
        }
      );

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      response.data.pipe(res);
      return null;
    } catch (err) {
      const { status, message } = handleProviderError(err, 'pollinations');
      throw { status, message };
    }
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/openai/chat/completions`,
      { messages, model: selectedModel, stream: false },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      }
    );

    return response.data;
  } catch (err) {
    const { status, message } = handleProviderError(err, 'pollinations');
    throw { status, message };
  }
}

async function listModels() {
  return AVAILABLE_MODELS.map((id) => ({
    id,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'pollinations',
  }));
}

module.exports = { chat, listModels };
