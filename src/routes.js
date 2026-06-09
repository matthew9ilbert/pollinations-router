const express = require('express');
const { logRequest, getStats } = require('./db');
const pollinations = require('./providers/pollinations');
const gemini = require('./providers/gemini');
const copilot = require('./providers/copilot');

const router = express.Router();

const PROVIDERS = {
  pollinations,
  gemini,
  copilot,
};

function getProvider(name) {
  return PROVIDERS[name] || null;
}

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/stats', async (req, res) => {
  try {
    const stats = getStats();
    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/v1/models', async (req, res) => {
  try {
    const allModels = await Promise.all(
      Object.entries(PROVIDERS).map(async ([providerName, provider]) => {
        const models = await provider.listModels();
        return models.map((m) => ({ ...m, provider: providerName }));
      })
    );
    res.json({ object: 'list', data: allModels.flat() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/v1/models/:provider', async (req, res) => {
  const { provider: providerName } = req.params;
  const provider = getProvider(providerName);
  if (!provider) {
    return res.status(404).json({ error: `Unknown provider: ${providerName}` });
  }
  try {
    const models = await provider.listModels();
    res.json({ object: 'list', data: models });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/v1/chat/completions', async (req, res) => {
  const { messages, model, stream } = req.body;
  const providerName = req.query.provider || req.headers['x-provider'] || 'pollinations';

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages is required and must be an array' });
  }

  const provider = getProvider(providerName);
  if (!provider) {
    return res.status(400).json({ error: `Unknown provider: ${providerName}` });
  }

  try {
    const result = await provider.chat({ messages, model, stream, res });

    logRequest({
      provider: providerName,
      model,
      promptTokens: result?.usage?.prompt_tokens,
      completionTokens: result?.usage?.completion_tokens,
      status: 200,
    });

    if (result !== null) {
      res.json(result);
    }
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';

    logRequest({ provider: providerName, model, status });

    res.status(status).json({ error: { message, type: 'provider_error', provider: providerName } });
  }
});

router.get('/', (req, res) => {
  res.json({
    name: 'pollinations-router',
    version: '1.0.0',
    description: 'OpenAI-compatible API router for multiple AI providers',
    providers: Object.keys(PROVIDERS),
    endpoints: {
      'GET /health': 'Health check',
      'GET /stats': 'Request statistics',
      'GET /v1/models': 'List all models across providers',
      'GET /v1/models/:provider': 'List models for a specific provider',
      'POST /v1/chat/completions': 'Chat completions (use ?provider=pollinations|gemini|copilot)',
    },
    usage: {
      default_provider: 'pollinations',
      select_provider: 'Add ?provider=<name> query param or X-Provider header',
    },
  });
});

module.exports = router;
