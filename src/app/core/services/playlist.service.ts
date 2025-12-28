import { Injectable, signal } from '@angular/core';
import { Song } from '../models/song.model';

@Injectable({
  providedIn: 'root',
})
export class PlaylistService {
  songs = signal<Song[]>([]);
  currentSong = signal<Song | null>(null);
  timeOffset = 5;

  setCurrentSong(song: Song | null) {
    this.currentSong.set(song);
  }

  setCurrentPlaylist(songs: Song[]) {
    this.songs.set(songs);
  }

  needToReplay(currentTime: number): boolean {
    return currentTime > this.timeOffset;
  }

  get previousSong(): Song {
    const songs = this.songs();
    if (songs.length === 0) throw new Error('Playlist is empty');
    
    const currentIndex = songs.findIndex(s => s.id === this.currentSong()?.id);
    if (currentIndex === -1) return songs[0];

    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    return songs[prevIndex];
  }

  get nextSong(): Song {
    const songs = this.songs();
    if (songs.length === 0) throw new Error('Playlist is empty');

    const currentIndex = songs.findIndex(s => s.id === this.currentSong()?.id);
    if (currentIndex === -1) return songs[0];

    const nextIndex = (currentIndex + 1) % songs.length;
    return songs[nextIndex];
  }

  getRandomSong(): Song {
    const songs = this.songs();
    if (songs.length === 0) throw new Error('Playlist is empty');
    return songs[Math.floor(Math.random() * songs.length)];
  }
}
