export const debounce = (callback: any, wait: number) => {
  let timeoutId: number | undefined = undefined;
  return (...args: any[]) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback.apply(null, args);
    }, wait);
  };
};
