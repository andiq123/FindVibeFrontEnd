export interface Song {
  id: string;
  artist: string;
  title: string;
  image: string;
  link: string;
  order: number;
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
