export interface Song {
  id: string;
  artist: string;
  title: string;
  image: string;
  link: string;
  order: number;
  /** Cached lyrics for vault tracks (filled after first explicit open). */
  lyrics?: string;
  /** Search source name from API (e.g. MuzJam, Mp3mn). */
  provider?: string;
}

const PROVIDER_HOST: Record<string, string> = {
  MuzJam: "muzjam.org",
  Mp3mn: "mp3mn.net",
};

/** Short host label for source badges (supports merged e.g. MuzJam+Mp3mn). */
export function sourceHost(provider?: string): string {
  if (!provider) return "";
  return provider
    .split("+")
    .map((p) => PROVIDER_HOST[p] ?? p)
    .join(" · ");
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
  pagination?: PaginationInfo | null;
}
export enum SearchStatus {
  None,
  Loading,
  Error,
  Finished,
}
