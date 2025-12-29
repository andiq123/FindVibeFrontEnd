import { Injectable, inject, effect } from '@angular/core';
import { PlaylistService } from './playlist.service';
import { PlayerService } from './player.service';
import { PlayerStatus } from '../../features/player/models/player.model';

@Injectable({
  providedIn: 'root',
})
export class MediaSessionService {
  private readonly playlistService = inject(PlaylistService);
  private readonly playerService = inject(PlayerService);

  constructor() {
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

    effect(() => {
      const status = this.playerService.status();
      if (!('mediaSession' in navigator)) return;

      if (status === PlayerStatus.Playing) {
        navigator.mediaSession.playbackState = 'playing';
      } else {
        navigator.mediaSession.playbackState = 'paused';
      }
    });

    effect(() => {
      const currentTime = this.playerService.currentTime();
      const duration = this.playerService.duration();

      if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;

      if (duration > 0 && currentTime <= duration) {
        try {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: 1,
            position: currentTime,
          });
        } catch (error) {
          console.error('Error setting media session position state:', error);
        }
      }
    });
  }

  initialize(): void {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('nexttrack', () => this.playerService.setNextSong());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.playerService.setPreviousSong());
    navigator.mediaSession.setActionHandler('play', () => this.playerService.play());
    navigator.mediaSession.setActionHandler('pause', () => this.playerService.pause());
    navigator.mediaSession.setActionHandler('stop', () => this.playerService.pause());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        this.playerService.seek(details.seekTime);
      }
    });

    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skipTime = details.seekOffset || 10;
      this.playerService.seek(Math.max(this.playerService.currentTime() - skipTime, 0));
    });

    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skipTime = details.seekOffset || 10;
      this.playerService.seek(Math.min(this.playerService.currentTime() + skipTime, this.playerService.duration()));
    });
  }
}
