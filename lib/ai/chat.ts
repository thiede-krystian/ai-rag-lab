import { chatConfig } from "@/lib/config";
import { getOpenRouterClient } from "@/lib/ai/openrouter-client";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

export async function createChatCompletion(messages: ChatMessage[], options: { temperature?: number } = {}) {
  const response = await getOpenRouterClient().chat.completions.create({
    model: chatConfig.model,
    messages,
    temperature: options.temperature ?? 0.2,
  });

  const content = response.choices[0]?.message.content;

  if (!content) {
    throw new Error("OpenRouter chat response did not include text content.");
  }

  return {
    content,
    model: response.model ?? chatConfig.model,
  };
}
