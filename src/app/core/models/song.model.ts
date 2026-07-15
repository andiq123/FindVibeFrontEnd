export interface Song {
  id: string;
  artist: string;
  title: string;
  image: string;
  link: string;
  order: number;
  /** Search source name from API (e.g. MuzJam, Mp3mn). */
  provider?: string;
}

/** Short host label for source badges. */
export function sourceHost(provider?: string): string {
  switch (provider) {
    case "MuzJam":
      return "muzjam.org";
    case "Mp3mn":
      return "mp3mn.net";
    default:
      return provider ?? "";
  }
}
export interface PaginationInfo {
  currentPage: number;
  totalResults: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalPages: number;
}
export interface SearchResponse {
  songs: Song[];
  pagination: PaginationInfo | null;
}
export enum SearchStatus {
  None,
  Loading,
  Error,
  Finished,
}
