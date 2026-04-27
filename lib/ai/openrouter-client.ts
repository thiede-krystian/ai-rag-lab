import OpenAICompatibleClient from "openai";
import { openRouterConfig } from "@/lib/config";

let openRouterClient: OpenAICompatibleClient | null = null;

export function getOpenRouterClient() {
  if (!openRouterConfig.apiKey) {
    throw new Error("OPENROUTER_API_KEY is required to call OpenRouter.");
  }

  openRouterClient ??= new OpenAICompatibleClient({
    apiKey: openRouterConfig.apiKey,
    baseURL: openRouterConfig.baseURL,
    defaultHeaders: {
      "HTTP-Referer": openRouterConfig.siteUrl,
      "X-Title": openRouterConfig.appTitle,
    },
  });

  return openRouterClient;
}
