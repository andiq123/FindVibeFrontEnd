import { Injectable, signal } from '@angular/core';
import { Song } from '../songs/models/song.model';
import { PlayerService } from './player.service';
import { Router } from '@angular/router';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class PlaylistService {
  songs = signal<Song[]>([]);
  currentSong = signal<Song | null>(null);
  timeOffset = 5;

  constructor(private settingsService: SettingsService) {}

  setCurrentSong(song: Song | null) {
    this.currentSong.set(song);
  }

  setCurrentPlaylist(songs: Song[]) {
    this.songs.set(songs);
  }

  needToReplay(currentTime: number) {
    return currentTime > this.timeOffset;
  }

  get previousSong(): Song {
    const songIndex = this.songs().findIndex(
      (song) => song.id === this.currentSong()?.id
    );

    if (songIndex === -1) {
      return this.songs()[0];
    }

    return this.songs()[
      (songIndex - 1 + this.songs().length) % this.songs().length
    ];
  }

  get nextSong(): Song {
    let songToReturn: Song;
    if (this.settingsService.isShuffle$()) {
      songToReturn = this.getRandomSongFromCurrentPlaylist();
    } else {
      songToReturn = this.nextSongHelper();
    }
    return songToReturn;
  }

  private nextSongHelper() {
    const songIndex = this.songs().findIndex(
      (song) => song.id === this.currentSong()?.id
    );

    if (songIndex === -1) {
      return this.songs()[0];
    }

    return this.songs()[(songIndex + 1) % this.songs().length];
  }

  private getRandomSongFromCurrentPlaylist(): Song {
    return this.songs()[Math.floor(Math.random() * this.songs().length)];
  }
}
