import {allowedUrl, loadMedia} from "../whatsapp/media.js";
import {agentPlanSchema} from "./schema.js";
import type BerryProtocol from "berryprotocol";
import { config } from "../config.js";
import type { AgentAction, AgentPlan } from "./schema.js";

const sanitizeButtons = <T extends { kind?: string; url?: string }>(buttons: T[]): T[] =>
  buttons.filter((button) => button.kind !== "cta_url" || (button.url && allowedUrl(button.url, config.agent.allowedCtaHosts)));

const executeAction = async (
  client: BerryProtocol,
  chatId: string,
  currentMessageId: string,
  action: AgentAction,
): Promise<void> => {
  switch (action.type) {
    case "text":
      await client.sendText(chatId, action.text);
      return;

    case "buttons": {
      const buttons = sanitizeButtons(action.buttons);
      if (buttons.length === 0) {
        await client.sendText(chatId, action.text);
        return;
      }
      await client.sendButtons(chatId, {
        text: action.text,
        footer: action.footer,
        buttons,
      });
      return;
    }

    case "list":
      await client.sendList(chatId, {
        title: action.title,
        text: action.text,
        footer: action.footer,
        buttonText: action.buttonText,
        sections: action.sections,
      });
      return;

    case "carousel":
      await client.sendCarousel(chatId, {
        text: action.text,
        footer: action.footer,
        cards: await Promise.all(action.cards.map(async (card) => ({
          title: card.title,
          body: card.body,
          footer: card.footer,
          image: card.imageUrl ? await loadMedia(card.imageUrl) : undefined,
          video: card.videoUrl ? await loadMedia(card.videoUrl) : undefined,
          buttons: card.buttons ? sanitizeButtons(card.buttons) : undefined,
        }))),
      });
      return;

    case "image":
      await client.sendImage(chatId, { ...await loadMedia(action.url), caption: action.caption });
      return;

    case "document":
      await client.sendDocument(chatId, {
        ...await loadMedia(action.url),
        fileName: action.fileName,
        mimetype: action.mimetype,
        caption: action.caption,
      });
      return;

    case "reaction":
      await client.sendReaction(chatId, action.emoji, currentMessageId);
      return;

    case "location":
      await client.sendLocation(chatId, {
        latitude: action.latitude,
        longitude: action.longitude,
        name: action.name,
        address: action.address,
      });
      return;
  }
};

export const executePlan = async (
  client: BerryProtocol,
  chatId: string,
  currentMessageId: string,
  plan: AgentPlan,
): Promise<void> => {
  const validated = agentPlanSchema.parse(plan);
  for (const action of validated.actions) {
    console.log(`[Agent] executing ${action.type}`);
    await executeAction(client, chatId, currentMessageId, action);
  }
};
