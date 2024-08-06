export interface Song {
  id: string;
  artist: string;
  title: string;
  image: string;
  link: string;
  downloaded?: boolean;
}

export enum SearchStatus {
  None,
  Loading,
  Error,
  Finished,
}
