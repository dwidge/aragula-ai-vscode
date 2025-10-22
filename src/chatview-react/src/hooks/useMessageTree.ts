import { useCallback, useMemo } from "react";
import type { ChatMessage } from "../types";

export const useMessageTree = (chatHistory: ChatMessage[]) => {
  const buildMessageTree = useCallback((messages: ChatMessage[]) => {
    const messageMap = new Map(messages.map((m) => [m.id, { ...m }]));
    const roots: ChatMessage[] = [];
    messages.forEach((msg) => {
      if (!msg.parentId) {
        roots.push(messageMap.get(msg.id)!);
      } else {
        const parent = messageMap.get(msg.parentId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children!.push(messageMap.get(msg.id)!);
        }
      }
    });
    roots.forEach((root) => {
      if (root.children) {
        root.children.sort((a: ChatMessage, b: ChatMessage) =>
          a.id.localeCompare(b.id)
        );
        root.children.forEach((child: ChatMessage) => {
          if (child.children) {
            child.children.sort((a: ChatMessage, b: ChatMessage) =>
              a.id.localeCompare(b.id)
            );
          }
        });
      }
    });
    return roots;
  }, []);

  const tree = useMemo(
    () => buildMessageTree(chatHistory),
    [chatHistory, buildMessageTree]
  );

  return { tree, buildMessageTree };
};
