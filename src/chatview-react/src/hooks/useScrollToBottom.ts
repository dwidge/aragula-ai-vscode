import { useCallback } from "react";

export const useScrollToBottom = (
  messagesContainerRef: React.RefObject<HTMLDivElement | null>
) => {
  return useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messagesContainerRef]);
};
