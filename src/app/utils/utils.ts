export const convertTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  if (isNaN(minutes) || isNaN(seconds)) {
    return '0:00';
  }
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const addHerokutoLink = (link: string) => {
  const corsProxy = 'https://cors-anywhere.herokuapp.com/';
  const proxiedUrl = `${corsProxy}${link}`;
  return proxiedUrl;
};

export const convertKbToMb = (kb: number): number => {
  return Math.round(kb / 1024);
};

export const convertMbToGb = (mb: number): number => {
  return Math.round(mb / 1024);
};

export const convertKbToGb = (kb: number): number => {
  const mbConverted = convertKbToMb(kb);
  return convertMbToGb(mbConverted);
};
