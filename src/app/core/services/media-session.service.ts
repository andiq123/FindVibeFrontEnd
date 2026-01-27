import { Injectable, inject, effect, untracked } from '@angular/core';
import { PlaylistService } from './playlist.service';
import { PlayerService } from './player.service';
import { PlayerStatus } from '../../features/player/models/player.model';

@Injectable({
  providedIn: 'root',
})
export class MediaSessionService {
  private readonly playlistService = inject(PlaylistService);
  private readonly playerService = inject(PlayerService);
  private lastPositionUpdateTime = 0;
  private readonly POSITION_UPDATE_THROTTLE_MS = 1000;

  constructor() {
    // Single effect: update all media session state at once
    effect(() => {
      if (!('mediaSession' in navigator)) return;

      const song = this.playlistService.currentSong();
      const status = this.playerService.status();
      const currentTime = this.playerService.currentTime();
      const duration = this.playerService.duration();

      // Update metadata when song changes
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

      // Update playback state
      navigator.mediaSession.playbackState = status === PlayerStatus.Playing ? 'playing' : 'paused';

      // Update position state (throttled)
      if ('setPositionState' in navigator.mediaSession) {
        const now = Date.now();
        if (now - this.lastPositionUpdateTime >= this.POSITION_UPDATE_THROTTLE_MS) {
          untracked(() => {
            if (duration > 0 && currentTime <= duration) {
              navigator.mediaSession.setPositionState({
                duration,
                playbackRate: 1,
                position: currentTime,
              });
              this.lastPositionUpdateTime = now;
            }
          });
        }
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
