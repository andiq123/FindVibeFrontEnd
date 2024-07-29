export const convertTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  if (isNaN(minutes) || isNaN(seconds)) {
    return '0:00';
  }
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};
