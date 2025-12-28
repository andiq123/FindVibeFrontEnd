import { Injectable, inject, effect } from '@angular/core';
import { PlaylistService } from './playlist.service';
import { PlayerService } from './player.service';

@Injectable({
  providedIn: 'root',
})
export class MediaSessionService {
  private playlistService = inject(PlaylistService);
  private playerService = inject(PlayerService);

  constructor() {
    this.setupMediaMetadata();
    this.setupActionHandlers();
  }

  private setupMediaMetadata() {
    effect(() => {
      const song = this.playlistService.currentSong();
      if (!song) return;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        artwork: [
          {
            src: song.image || '',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      });
    });
  }

  private setupActionHandlers() {
    navigator.mediaSession.setActionHandler('nexttrack', () => this.playerService.setNextSong());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.playerService.setPreviousSong());
    navigator.mediaSession.setActionHandler('play', () => this.playerService.play());
    navigator.mediaSession.setActionHandler('pause', () => this.playerService.pause());
    navigator.mediaSession.setActionHandler('stop', () => this.playerService.stop());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        this.playerService.setCurrentTime(details.seekTime);
      }
    });
  }
}
