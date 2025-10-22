import { useCallback } from 'react';

export const useDebounce = (func: Function, delay: number) => {
  let timeout: NodeJS.Timeout;
  return useCallback((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  }, [func, delay]);
};
