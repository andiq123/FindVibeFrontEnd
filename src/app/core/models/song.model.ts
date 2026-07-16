export interface Song {
  id: string;
  artist: string;
  title: string;
  image: string;
  link: string;
  order: number;
  /** Search source name from API (e.g. Mp3mn). */
  provider?: string;
}

/** Short host label for source badges. */
export function sourceHost(provider?: string): string {
  switch (provider) {
    case "Mp3mn":
      return "mp3mn.net";
    default:
      return provider ?? "";
  }
}
export interface SearchResponse {
  songs: Song[];
}
export enum SearchStatus {
  None,
  Loading,
  Error,
  Finished,
}
