export default function debounce<Params extends unknown[]>(
  func: (...args: Params) => void,
  timeout: number
): (...args: Params) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Params) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}
