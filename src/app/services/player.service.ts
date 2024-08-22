import { computed, Injectable, signal } from '@angular/core';
import { Song } from '../songs/models/song.model';
import { PlayerStatus } from '../components/player-wrapper/models/player.model';
import { SettingsService } from './settings.service';
import { RecentService } from '../recent/services/recent.service';
import { PlaylistService } from './playlist.service';
import { StorageService } from '../library/services/storage.service';
import { addProxyLink } from '../utils/utils';

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
      this.status$.set(PlayerStatus.Playing);
      this.retries.set(0);
    });

    this.player().addEventListener('pause', () => {
      this.status$.set(PlayerStatus.Paused);
    });

    this.player().addEventListener('ended', async () => {
      this.status$.set(PlayerStatus.Ended);
    });

    this.player().addEventListener('error', async () => {
      if (this.retries() >= this.maxRetries) {
        this.status$.set(PlayerStatus.Error);
        this.retries.set(0);
        return;
      }

      this.retries.update((prev) => prev + 1);
      this.setSong(this.song$()!);
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
    this.retries.set(0);
    this.alreadyAddedInRecents.set(false);
    this.status$.set(PlayerStatus.Loading);

    if (this.player().paused) {
      this.player().pause();
    }

    this.playlistService.setCurrentSong(song);
    const offlineLink = await this.storageService.isAvalaibleOffline(song.link);

    if (offlineLink) {
      const blob = await offlineLink.blob();
      this.player().src = URL.createObjectURL(blob);
    } else {
      this.player().src = addProxyLink(song.link);
    }

    this.player().play();
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
