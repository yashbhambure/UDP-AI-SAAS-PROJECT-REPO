/**
 * llmService.js — The single Groq API gateway for all LLM calls.
 *
 * Rules enforced here so route handlers never need to think about them:
 *  - Model selection: llama-3.3-70b-versatile
 *  - Automatic retry on JSON parse failure with a stricter system prefix
 *  - Dev-mode raw output logging
 *  - Typed LLMError thrown on repeated failure (routes catch → 422)
 */

const Groq = require('groq-sdk');
const logger = require('../utils/logger');
const { getEmbedding } = require('./embeddingService');

// ── Custom error type ─────────────────────────────────────────────────────────
class LLMError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'LLMError';
    this.cause = cause;
    this.statusCode = 422;
  }
}

// ── Client initialisation (lazy, so tests can mock before require) ────────────
let _groq = null;
const getGroqClient = () => {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new LLMError('GROQ_API_KEY is not set');
    }
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
};

/**
 * extractJSON — tries to pull a JSON object/array out of raw LLM text.
 * Handles the common cases where model wraps JSON in markdown code fences.
 */
const extractJSON = (text) => {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  return JSON.parse(cleaned);
};

/**
 * callLLM — the single entry point for all Groq completions text generation.
 *
 * @param {object} options
 * @param {string} options.prompt           - User-turn prompt content
 * @param {string} [options.systemPrompt]   - Optional system instruction
 * @param {boolean} [options.expectJSON]    - If true, parses + retries on failure
 * @param {string} [options.promptName]     - Label for dev logging (e.g. "extraction")
 * @returns {Promise<string|object>}        - Raw string or parsed JSON object
 */
const callLLM = async ({
  prompt,
  systemPrompt = '',
  expectJSON = false,
  promptName = 'llm',
}) => {
  const attempt = async (extraPrefix = '') => {
    const groq = getGroqClient();
    const systemInstruction = systemPrompt;
    const userPrompt = extraPrefix ? `${extraPrefix}\n\n${prompt}` : prompt;

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: userPrompt });

    try {
      const modelName = 'llama-3.3-70b-versatile';
      const params = {
        messages,
        model: modelName,
        temperature: 0.1,
      };

      if (expectJSON) {
        params.response_format = { type: 'json_object' };
      }

      const response = await groq.chat.completions.create(params);
      const raw = response.choices[0]?.message?.content || '';

      // Log raw output in dev mode for every call
      logger.logLLMOutput(promptName, raw);

      return raw;
    } catch (err) {
      logger.error(`[llmService] Groq chat completion failed for prompt "${promptName}": ${err.message}`, err);
      throw err;
    }
  };

  // ── Non-JSON path: single call, return string ─────────────────────────────
  if (!expectJSON) {
    try {
      return await attempt();
    } catch (err) {
      throw new LLMError(`LLM call failed for "${promptName}": ${err.message}`, err);
    }
  }

  // ── JSON path: up to 2 attempts ───────────────────────────────────────────
  let raw;
  try {
    raw = await attempt();
  } catch (apiErr) {
    logger.error(`[llmService] API call failed on first attempt for "${promptName}": ${apiErr.message}`);
    throw new LLMError(`LLM call failed for "${promptName}": ${apiErr.message}`, apiErr);
  }

  try {
    return extractJSON(raw);
  } catch (firstErr) {
    logger.warn(
      `[llmService] JSON parse failed on first attempt for "${promptName}". Retrying with strict prefix.`
    );

    // Second attempt: add a forceful prefix to push the model toward clean JSON
    const strictPrefix =
      'IMPORTANT: Respond with ONLY valid JSON. No markdown, no explanation, no code fences. ' +
      'Start your response with { and end with }.';

    try {
      raw = await attempt(strictPrefix);
    } catch (apiErr2) {
      logger.error(`[llmService] API call failed on second attempt for "${promptName}": ${apiErr2.message}`);
      throw new LLMError(`LLM call failed for "${promptName}": ${apiErr2.message}`, apiErr2);
    }

    try {
      return extractJSON(raw);
    } catch (secondErr) {
      logger.error(
        `[llmService] JSON parse failed on both attempts for "${promptName}". Raw output: ${raw}`
      );
      throw new LLMError(
        `LLM returned invalid JSON for "${promptName}" after 2 attempts.`,
        secondErr
      );
    }
  }
};

module.exports = { callLLM, getEmbedding, LLMError };
