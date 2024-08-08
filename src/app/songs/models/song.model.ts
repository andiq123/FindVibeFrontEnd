export interface Song {
  id: string;
  artist: string;
  title: string;
  image: string;
  link: string;
}

export enum SearchStatus {
  None,
  Loading,
  Error,
  Finished,
}
