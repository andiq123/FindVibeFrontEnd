import { computed, Injectable, signal, effect, inject } from '@angular/core';
import { Song } from '../models/song.model';
import { PlayerStatus } from '../../features/player/models/player.model';
import { SettingsService } from './settings.service';
import { RecentService } from '../../features/recent/services/recent.service';
import { PlaylistService } from './playlist.service';
import { OfflineStorageService } from '../../features/library/services/offline-storage.service';
import { AudioService } from './audio.service';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private settingsService = inject(SettingsService);
  private recentService = inject(RecentService);
  private playlistService = inject(PlaylistService);
  private offlineStorageService = inject(OfflineStorageService);
  private audioService = inject(AudioService);

  private isFirstError = signal(true);
  private alreadyAddedInRecents = signal<boolean>(false);

  song = computed(() => this.playlistService.currentSong());
  status = this.audioService.status;
  currentTime = this.audioService.currentTime;
  duration = this.audioService.duration;

  constructor() {
    this.setupRecentsEffect();
  }

  private setupRecentsEffect() {
    effect(() => {
      const time = this.currentTime();
      const song = this.song();
      if (time > 7 && !this.alreadyAddedInRecents() && song) {
        this.alreadyAddedInRecents.set(true);
        this.recentService.addSongToRecents(song);
      }
    });
  }

  async setSong(song: Song) {
    this.playlistService.setCurrentSong(song);
    this.audioService.pause();
    this.audioService.seek(0);
    this.alreadyAddedInRecents.set(false);
    this.isFirstError.set(true);

    const offlineLink = await this.offlineStorageService.isAvalaibleOffline(song.link);
    if (offlineLink) {
      const blob = await offlineLink.blob();
      this.audioService.setSource(URL.createObjectURL(blob));
    } else {
      this.audioService.setSource(song.link);
    }
    
    await this.audioService.play();
  }

  setCurrentTime(time: number) {
    this.audioService.seek(time);
  }

  getCurrentTime() {
    return this.audioService.currentTime();
  }

  async play() {
    await this.audioService.play();
  }

  pause() {
    this.audioService.pause();
  }

  stop() {
    this.audioService.stop();
  }

  async setPreviousSong() {
    if (this.playlistService.needToReplay(this.currentTime())) {
      this.audioService.seek(0);
      await this.play();
      return;
    }

    const previousSong = this.playlistService.previousSong;
    await this.setSong(previousSong);
    return previousSong;
  }

  async setNextSong() {
    if (this.settingsService.isRepeat()) {
      this.audioService.seek(0);
      await this.play();
      return;
    }

    let songToBePlayed: Song;
    if (this.settingsService.isShuffle()) {
      songToBePlayed = this.playlistService.getRandomSong();
    } else {
      songToBePlayed = this.playlistService.nextSong;
    }

    if (!songToBePlayed) return;
    await this.setSong(songToBePlayed);
    return songToBePlayed;
  }
}
