import { Injectable, inject, effect, OnDestroy } from '@angular/core';
import { PlaylistService } from './playlist.service';
import { PlayerService } from './player.service';
import { PlayerStatus } from '../../features/player/models/player.model';
@Injectable({
  providedIn: 'root',
})
export class MediaSessionService implements OnDestroy {
  private readonly playlistService = inject(PlaylistService);
  private readonly playerService = inject(PlayerService);
  private lastPositionUpdateTime = 0;
  private readonly POSITION_UPDATE_THROTTLE_MS = 1000;
  private positionUpdateInterval: number | null = null;
  private lastSongId: string | null = null;
  private lastStatus: PlayerStatus | null = null;
  constructor() {
    effect(() => {
      if (!('mediaSession' in navigator)) return;
      const song = this.playlistService.currentSong();
      const status = this.playerService.status();
      const songId = song?.id || null;
      if (songId !== this.lastSongId) {
        this.lastSongId = songId;
        if (song) {
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
        }
      }
      if (status !== this.lastStatus) {
        this.lastStatus = status;
        navigator.mediaSession.playbackState = status === PlayerStatus.Playing ? 'playing' : 'paused';
      }
    });
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      this.positionUpdateInterval = window.setInterval(() => {
        const currentTime = this.playerService.currentTime();
        const duration = this.playerService.duration();
        const now = Date.now();
        if (now - this.lastPositionUpdateTime >= this.POSITION_UPDATE_THROTTLE_MS) {
          if (duration > 0 && currentTime <= duration) {
            navigator.mediaSession.setPositionState({
              duration,
              playbackRate: 1,
              position: currentTime,
            });
            this.lastPositionUpdateTime = now;
          }
        }
      }, this.POSITION_UPDATE_THROTTLE_MS);
    }
  }
  ngOnDestroy() {
    if (this.positionUpdateInterval !== null) {
      clearInterval(this.positionUpdateInterval);
      this.positionUpdateInterval = null;
    }
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
