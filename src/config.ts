import "dotenv/config";

const int = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bool = (value: string | undefined, fallback: boolean) => {
  if (value == null) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

export const config = {
  apinex: {
    baseUrl: (process.env.APINEX_BASE_URL ?? "https://api.apinex.bond").replace(/\/$/, ""),
    apiKey: process.env.APINEX_API_KEY ?? "",
    model: process.env.APINEX_MODEL ?? "free/gpt-6-luna",
    maxTokens: int(process.env.APINEX_MAX_TOKENS, 2048),
  },
  berry: {
    sessionId: process.env.BERRY_SESSION_ID ?? "ai-agent",
    databasePath: process.env.BERRY_DATABASE_PATH ?? "./data/berry.db",
    authFolder: process.env.BERRY_AUTH_FOLDER ?? "./data/auth",
  },
  agent: {
    name: process.env.AGENT_NAME ?? "Atendente IA",
    businessPrompt:
      process.env.BUSINESS_PROMPT ??
      "Você atende clientes de uma empresa. Seja objetivo, educado e ajude o cliente a avançar para a próxima etapa.",
    maxHistoryMessages: int(process.env.MAX_HISTORY_MESSAGES, 30),
    allowGroups: bool(process.env.ALLOW_GROUPS, false),
    allowedCtaHosts: (process.env.ALLOWED_CTA_HOSTS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  },
};

export const assertConfig = () => {
  if (!config.apinex.apiKey) {
    throw new Error("APINEX_API_KEY não foi configurada no .env");
  }
};
