import { Injectable, signal } from "@angular/core";
import { Song } from "../models/song.model";
const RECENT_SONGS_KEY = "recentLibrary";
const RECENT_SONGS_LIMIT = 50;
@Injectable({
  providedIn: "root",
})
export class StorageService {
  private readonly _recentSongs = signal<Song[]>(this.getRecentSongsFromStorage());
  readonly recentSongs = this._recentSongs.asReadonly();
  setItem(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
  }
  getItem<T>(key: string): T | null {
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      console.error(`Error parsing storage key "${key}":`, e);
      return null;
    }
  }
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
  addSongToRecents(song: Song): void {
    const currentSongs = this._recentSongs();
    const filtered = currentSongs.filter((s: Song) => s.link !== song.link);
    const updatedSongs = [song, ...filtered].slice(0, RECENT_SONGS_LIMIT);
    this._recentSongs.set(updatedSongs);
    this.setItem(RECENT_SONGS_KEY, updatedSongs);
  }
  clearRecents(): void {
    this._recentSongs.set([]);
    this.removeItem(RECENT_SONGS_KEY);
  }
  private getRecentSongsFromStorage(): Song[] {
    return this.getItem<Song[]>(RECENT_SONGS_KEY) || [];
  }
}
