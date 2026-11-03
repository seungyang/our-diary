import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { BuiltPrompt } from "./prompts";

/**
 * 해석 계층.
 *  - ANTHROPIC_API_KEY가 있으면 API 모드: 여기서 바로 답을 받는다.
 *  - 없으면 복사 모드: 화면이 프롬프트를 보여주고, 사용자가 세션에 붙여넣은 뒤 답을 붙여넣는다.
 */
export const MODEL = "claude-opus-5";

export function apiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function interpret(prompt: BuiltPrompt): Promise<{ text: string; model: string }> {
  const client = new Anthropic();
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    system: [{ type: "text", text: prompt.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: prompt.user }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    throw new Error("모델이 이 질문에 답하지 않았어요. 질문을 바꿔 다시 시도해 주세요.");
  }
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return { text, model: message.model };
}
