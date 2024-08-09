export interface Reorder {
  songId: string;
  order: number;
}

export interface ReorderRequest {
  reorders: Reorder[];
}
