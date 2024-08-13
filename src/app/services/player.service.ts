import { computed, Injectable, signal } from '@angular/core';
import { Song } from '../songs/models/song.model';
import { PlayerStatus } from '../components/player-wrapper/models/player.model';
import { SettingsService } from './settings.service';
import { RecentService } from '../recent/services/recent.service';
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
  retries = signal<number>(0);
  private maxRetries = 15;

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
        this.isFirstError.set(false);
        await this.retryError();
        return;
      }
      this.isFirstError.set(true);
      this.status$.set(PlayerStatus.Error);
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
      const blob = await offlineLink.blob();
      if (blob.type !== 'audio/mpeg') {
        await this.storageService.removeOneSongFromAvailableOfflineSongIds(
          song.id,
          song.link
        );
        this.player().src = song.link;
        return;
      }
      this.player().src = URL.createObjectURL(blob);
    } else {
      this.player().src = song.link;
    }

    this.player().play();
  }

  private async retryError() {
    if (this.retries() >= this.maxRetries) {
      this.retries.set(0);
      this.status$.set(PlayerStatus.Error);
      return;
    }

    await this.storageService.cacheSong(this.song$()!);
    const resp = await this.storageService.isAvalaibleOffline(
      this.song$()!.link
    );
    if (!resp) {
      this.retries.update((prev) => prev + 1);
      this.retryError();
      return;
    }

    const blob = await resp.blob();
    if (blob.type !== 'audio/mpeg') {
      this.retries.update((prev) => prev + 1);
      await this.retryError();
      return;
    }
    this.retries.set(0);
    await this.setSong(this.song$()!);
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
