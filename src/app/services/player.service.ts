import { computed, Injectable, signal } from '@angular/core';
import { Song } from '../songs/models/song.model';
import { PlayerStatus } from '../components/player-wrapper/models/player.model';
import { SettingsService } from './settings.service';
import { RecentService } from '../recent/services/recent.service';
import { addProxyLink } from '../utils/utils';
import { PlaylistService } from './playlist.service';
import { StorageService } from '../library/services/storage.service';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private player = signal<HTMLAudioElement>(new Audio());
  song$ = computed(() => this.playlistService.currentSong());
  status$ = signal<PlayerStatus>(PlayerStatus.Stopped);
  currentTime$ = signal<number>(0);
  duration$ = signal<number>(0);
  alreadyAddedInRecents = signal<boolean>(false);
  isFirstError = signal<boolean>(true);

  constructor(
    private settingsService: SettingsService,
    private recentService: RecentService,
    private playlistService: PlaylistService,
    private storageService: StorageService
  ) {}

  registerEvents() {
    this.player().addEventListener('playing', () => {
      if (!this.isFirstError()) {
        this.isFirstError.set(true);
      }
      this.status$.set(PlayerStatus.Playing);
    });

    this.player().addEventListener('pause', () => {
      this.status$.set(PlayerStatus.Paused);
    });

    this.player().addEventListener('ended', async () => {
      this.status$.set(PlayerStatus.Ended);
    });

    this.player().addEventListener('error', async () => {
      if (this.isFirstError()) {
        this.status$.set(PlayerStatus.Loading);
        console.log('error loading retrying...');
        await this.retryError();
        this.isFirstError.set(false);
      }
    });

    this.player().addEventListener('timeupdate', () => {
      this.currentTime$.set(this.player().currentTime);
      this.updateDuration(this.player().duration);

      if (this.currentTime$() > 7 && !this.alreadyAddedInRecents()) {
        this.alreadyAddedInRecents.set(true);
        this.recentService.addSongToRecents(this.song$()!);
      }
    });

    this.player().controls = false;
  }
  async setSong(song: Song) {
    this.status$.set(PlayerStatus.Loading);
    this.playlistService.setCurrentSong(song);

    const offlineLink = await this.storageService.isAvalaibleOffline(song.link);
    if (offlineLink) {
      const response = await fetch(offlineLink);
      const blob = await response.blob();
      this.player().src = URL.createObjectURL(blob);
    } else {
      this.player().src = offlineLink ? offlineLink : song.link;
    }

    this.player().play();
  }

  private async retryError() {
    await this.storageService.cacheSong(this.song$()!);
    const offlineLink = await this.storageService.isAvalaibleOffline(
      this.song$()!.link
    );
    if (offlineLink) {
      const response = await fetch(offlineLink);
      const blob = await response.blob();
      if (blob.type !== 'audio/mpeg') {
        this.status$.set(PlayerStatus.Error);
      }
      this.player().src = URL.createObjectURL(blob);

      this.player().play();
    } else {
      this.status$.set(PlayerStatus.Error);
    }
  }

  setCurrentTime(time: number) {
    this.player().currentTime = time;
  }

  async play() {
    await this.player().play();
  }

  pause() {
    this.player().pause();
  }

  stop() {
    this.player().pause();
    this.player().currentTime = 0;
  }

  async setPreviousSong() {
    if (this.playlistService.needToReplay(this.currentTime$())) {
      this.player().currentTime = 0;
      return;
    }

    const previousSong = this.playlistService.previousSong;
    await this.setSong(previousSong);
    this.play();
    return previousSong;
  }

  async setNextSong() {
    if (this.settingsService.isRepeat$()) {
      this.player().currentTime = 0;
      this.play();
      return;
    }

    const songToBePlayed = this.playlistService.nextSong;
    if (songToBePlayed === undefined || songToBePlayed === null) return;
    await this.setSong(songToBePlayed);
    this.play();
    return songToBePlayed;
  }

  private updateDuration(time: number) {
    if (!this.duration$()) {
      this.duration$.set(time);
      return;
    }

    if (time !== this.duration$()) {
      this.duration$.set(time);
      return;
    }

    return;
  }
}
