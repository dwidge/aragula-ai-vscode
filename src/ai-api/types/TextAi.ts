/**
 * AI call function type.
 */
export type TextAi = (
  user: string,
  system: string,
  options?: {
    signal?: AbortSignal;
    logger?: (message: string) => void;
  }
) => Promise<string>;
