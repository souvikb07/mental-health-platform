import "server-only";

import OpenAI from "openai";

export function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

export function getOpenAiModel() {
  return process.env.OPENAI_MODEL?.trim() || null;
}

export function hasOpenAiConfig() {
  return Boolean(getOpenAiApiKey() && getOpenAiModel());
}

export function getOpenAiClient() {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}
