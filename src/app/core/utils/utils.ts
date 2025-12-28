

export const convertTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  if (isNaN(minutes) || isNaN(seconds)) {
    return '0:00';
  }
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const bytesToGB = (bytes: number): number => {
  return parseFloat((bytes / 1024 ** 3).toFixed(2));
};

export const delayCustom = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time));
