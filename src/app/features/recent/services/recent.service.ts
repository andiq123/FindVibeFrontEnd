import { Injectable, inject, signal } from "@angular/core";
import { StorageService } from "../../../core/services/storage.service";
import { Song } from "../../../core/models/song.model";

const RECENT_SONGS_KEY = "recentLibrary";
const RECENT_SONGS_LIMIT = 20;

@Injectable({
  providedIn: "root",
})
export class RecentService {
  private readonly storageService = inject(StorageService);

  private readonly _songs = signal<Song[]>(this.getRecentSongsFromStorage());
  readonly songs = this._songs.asReadonly();

  addSongToRecents(song: Song): void {
    const currentSongs = this._songs();
    const filtered = currentSongs.filter((s: Song) => s.link !== song.link);
    const updatedSongs = [song, ...filtered].slice(0, RECENT_SONGS_LIMIT);

    this._songs.set(updatedSongs);
    this.storageService.setItem(RECENT_SONGS_KEY, updatedSongs);
  }

  private getRecentSongsFromStorage(): Song[] {
    return this.storageService.getItem<Song[]>(RECENT_SONGS_KEY) || [];
  }
}
