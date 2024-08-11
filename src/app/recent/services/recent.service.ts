import { Injectable } from '@angular/core';
import { Song } from '../../songs/models/song.model';

@Injectable({
  providedIn: 'root',
})
export class RecentService {
  limit = 20;

  addSongToRecents(song: Song) {
    let songs = this.getSongsFromLocalStorage();
    const alreadyExists = songs.find((s) => s.link === song.link);
    if (alreadyExists) {
      songs = songs.filter((s) => s.link !== song.link);
    }
    songs.unshift(song);
    this.addSongsToLocalStorage(songs.slice(0, this.limit));
  }

  getRecentSongs() {
    return this.getSongsFromLocalStorage();
  }

  private addSongsToLocalStorage(songs: Song[]) {
    localStorage.setItem('recentLibrary', JSON.stringify(songs));
  }

  private getSongsFromLocalStorage() {
    const songs = localStorage.getItem('recentLibrary');
    if (!songs) return [];
    return JSON.parse(songs) as Song[];
  }
}
