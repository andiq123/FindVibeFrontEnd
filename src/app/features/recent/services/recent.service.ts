import { Injectable, inject } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { Song } from '../../../core/models/song.model';

const RECENT_SONGS_KEY = 'recentLibrary';
const RECENT_SONGS_LIMIT = 20;

@Injectable({
  providedIn: 'root',
})
export class RecentService {
  private readonly storageService = inject(StorageService);

  addSongToRecents(song: Song): void {
    let songs = this.getRecentSongs();
    const alreadyExists = songs.find((s) => s.link === song.link);
    
    if (alreadyExists) {
      songs = songs.filter((s) => s.link !== song.link);
    }
    
    songs.unshift(song);
    this.storageService.setItem(RECENT_SONGS_KEY, songs.slice(0, RECENT_SONGS_LIMIT));
  }

  getRecentSongs(): Song[] {
    return this.storageService.getItem<Song[]>(RECENT_SONGS_KEY) || [];
  }
}
