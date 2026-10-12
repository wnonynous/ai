type IncomingLike = {
  id?: string;
  selectedRowId?: string;
  from?: string;
  chatId?: string;
  remoteJid?: string;
  type?: string;
  text?: string;
  buttonId?: string;
  selectedButtonId?: string;
  rawButtonParamsJson?: string;
  media?: { caption?: string };
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
};

export const getChatId = (message: IncomingLike): string | null =>
  message.chatId ?? message.remoteJid ?? message.from ?? null;

export const normalizeIncomingForAgent = (message: IncomingLike): string => {
  const selected = getSelectedId(message);
  if (selected) {
    return `O usuário selecionou uma opção da interface. selected_id=${JSON.stringify(selected)}.`;
  }

  if (message.text?.trim()) return message.text.trim();

  switch (message.type) {
    case "image":
      return message.media?.caption
        ? `[O usuário enviou uma imagem com a legenda: ${message.media.caption}]`
        : "[O usuário enviou uma imagem. O conteúdo visual não foi analisado.]";
    case "audio":
      return "[O usuário enviou um áudio. Transcrição não configurada.]";
    case "document":
      return message.media?.caption
        ? `[O usuário enviou um documento com a legenda: ${message.media.caption}]`
        : "[O usuário enviou um documento.]";
    case "location": {
      const loc = message.location;
      return `[O usuário enviou uma localização${loc?.name ? `: ${loc.name}` : ""}${
        loc?.latitude != null && loc?.longitude != null ? ` (${loc.latitude}, ${loc.longitude})` : ""
      }.]`;
    }
    default:
      return `[O usuário enviou uma mensagem do tipo ${message.type ?? "desconhecido"}.]`;
  }
};

export const getSelectedId = (message:IncomingLike):string|undefined => {
 if(message.selectedButtonId||message.buttonId||message.selectedRowId)return message.selectedButtonId??message.buttonId??message.selectedRowId;
 if(message.rawButtonParamsJson){try{const p=JSON.parse(message.rawButtonParamsJson);const id=p.id??p.selected_row_id??p.selectedButtonId??p.buttonId??p.single_select_reply?.selected_row_id;return typeof id==='string'?id:undefined;}catch{return undefined;}}
 return undefined;
};
