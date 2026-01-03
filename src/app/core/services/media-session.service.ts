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
    this.setupMetadataEffect();
    this.setupPlaybackStateEffect();
    this.setupPositionStateEffect();
  }

  private setupMetadataEffect(): void {
    effect(() => {
      const song = this.playlistService.currentSong();
      if (!song || !('mediaSession' in navigator)) return;

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

  private setupPlaybackStateEffect(): void {
    effect(() => {
      const status = this.playerService.status();
      if (!('mediaSession' in navigator)) return;

      navigator.mediaSession.playbackState = status === PlayerStatus.Playing ? 'playing' : 'paused';
    });
  }

  private setupPositionStateEffect(): void {
    effect(() => {
      const currentTime = this.playerService.currentTime();
      const duration = this.playerService.duration();

      if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;

      if (duration > 0 && currentTime <= duration) {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: 1,
          position: currentTime,
        });
      }
    });
  }

  initialize(): void {
    if (!('mediaSession' in navigator)) return;

    const ms = navigator.mediaSession;
    ms.setActionHandler('nexttrack', () => this.playerService.setNextSong());
    ms.setActionHandler('previoustrack', () => this.playerService.setPreviousSong());
    ms.setActionHandler('play', () => this.playerService.play());
    ms.setActionHandler('pause', () => this.playerService.pause());
    ms.setActionHandler('stop', () => this.playerService.pause());
    ms.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        this.playerService.seek(details.seekTime);
      }
    });
  }
}
