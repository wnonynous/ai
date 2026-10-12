const tails = new Map<string, Promise<void>>();

export const enqueueByChat = (chatId: string, task: () => Promise<void>): Promise<void> => {
  const previous = tails.get(chatId) ?? Promise.resolve();

  const current = previous
    .catch(() => undefined)
    .then(task)
    .finally(() => {
      if (tails.get(chatId) === current) tails.delete(chatId);
    });

  tails.set(chatId, current);
  return current;
};
