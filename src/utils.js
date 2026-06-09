function buildOpenAIMessages(messages) {
  if (!Array.isArray(messages)) {
    throw new Error('messages must be an array');
  }
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

function extractTextFromOpenAIResponse(data) {
  return data?.choices?.[0]?.message?.content || '';
}

function createOpenAIResponse({ content, model, promptTokens, completionTokens }) {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model || 'unknown',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: promptTokens || 0,
      completion_tokens: completionTokens || 0,
      total_tokens: (promptTokens || 0) + (completionTokens || 0),
    },
  };
}

function handleProviderError(err, provider) {
  const status = err?.response?.status || 500;
  const message = err?.response?.data?.error?.message || err.message || 'Unknown error';
  console.error(`[${provider}] Error ${status}: ${message}`);
  return { status, message };
}

module.exports = {
  buildOpenAIMessages,
  extractTextFromOpenAIResponse,
  createOpenAIResponse,
  handleProviderError,
};
