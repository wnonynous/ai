import type { AgentPlan } from "./schema.js";

type Role = "user" | "assistant";
export type HistoryMessage = { role: Role; content: string };

export class ConversationMemory {
  private readonly conversations = new Map<string, HistoryMessage[]>();

  constructor(private readonly maxMessages: number) {}

  get(chatId: string): HistoryMessage[] {
    return [...(this.conversations.get(chatId) ?? [])];
  }

  add(chatId: string, message: HistoryMessage): void {
    const history = [...(this.conversations.get(chatId) ?? []), message];
    this.conversations.set(chatId, history.slice(-this.maxMessages));
  }
}

export const summarizePlanForMemory = (plan: AgentPlan): string =>
  plan.actions
    .map((action) => {
      switch (action.type) {
        case "text":
          return action.text;
        case "buttons":
          return `${action.text}\n[botões: ${action.buttons.map((b) => `${b.title} (${b.id})`).join(", ")}]`;
        case "list":
          return `${action.text}\n[menu: ${action.sections.flatMap((s) => s.rows.map((r) => `${r.title} (${r.id})`)).join(", ")}]`;
        case "carousel":
          return `${action.text}\n[carrossel: ${action.cards.map((c) => c.title ?? c.body ?? "item").join(" | ")}]`;
        case "image":
          return `[imagem enviada] ${action.caption ?? ""}`.trim();
        case "document":
          return `[documento enviado: ${action.fileName}] ${action.caption ?? ""}`.trim();
        case "reaction":
          return `[reação ${action.emoji}]`;
        case "location":
          return `[localização enviada: ${action.name ?? `${action.latitude},${action.longitude}`}]`;
      }
    })
    .join("\n");
