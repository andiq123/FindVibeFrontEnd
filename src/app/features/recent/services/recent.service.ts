import { Injectable, inject } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { Song } from '../../../core/models/song.model';

@Injectable({
  providedIn: 'root',
})
export class RecentService {
  private storageService = inject(StorageService);
  limit = 20;

  addSongToRecents(song: Song) {
    let songs = this.getRecentSongs();
    const alreadyExists = songs.find((s) => s.link === song.link);
    if (alreadyExists) {
      songs = songs.filter((s) => s.link !== song.link);
    }
    songs.unshift(song);
    this.storageService.setItem('recentLibrary', songs.slice(0, this.limit));
  }

  getRecentSongs() {
    return this.storageService.getItem<Song[]>('recentLibrary') || [];
  }
}
