import { computed, inject, Injectable, signal } from '@angular/core';
import { Song } from '../songs/models/song.model';
import { PlayerStatus } from '../components/player-wrapper/models/player.model';
import { SettingsService } from './settings.service';
import { RecentService } from '../recent/services/recent.service';
import { addProxyLink } from '../utils/utils';
import { PlaylistService } from './playlist.service';
import { RemoteService } from './remote.service';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private player = signal<HTMLAudioElement>(new Audio());
  song$ = computed(() => this.playlistService.currentSong());
  status$ = signal<PlayerStatus>(PlayerStatus.Stopped);
  currentTime$ = signal<number>(0);
  duration$ = signal<number>(0);
  firstError = signal<boolean>(true);
  alreadyAddedInRecents = signal<boolean>(false);

  constructor(
    private settingsService: SettingsService,
    private recentService: RecentService,
    private playlistService: PlaylistService
  ) {}

  registerEvents() {
    this.player().addEventListener('loadstart', () => {
      this.status$.set(PlayerStatus.Loading);
    });

    this.player().addEventListener('playing', () => {
      if (!this.firstError()) {
        this.firstError.set(true);
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
      await this.errorRetry();
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
    try {
      this.alreadyAddedInRecents.set(false);
      const cachedLibrary = await caches.open('library');

      const proxiedUrl = addProxyLink(song.link);
      const inCache = await cachedLibrary.match(proxiedUrl);
      if (inCache) {
        const blob = await inCache!.blob();
        this.player().src = URL.createObjectURL(blob);
      } else {
        this.player().src = song.link;
      }
      this.playlistService.setCurrentSong(song);
      this.player().play();
    } catch (error) {
      await this.errorRetry();
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

  private async errorRetry() {
    if (this.firstError()) {
      this.status$.set(PlayerStatus.Loading);
      const proxiedUrl = addProxyLink(this.song$()!.link);
      const response = await fetch(proxiedUrl);
      const blob = await response.blob();
      this.player().src = URL.createObjectURL(blob);
      setTimeout(() => {
        this.player().play();
        this.firstError.set(false);
      }, 500);
    } else {
      this.firstError.set(true);
      this.status$.set(PlayerStatus.Error);
      this.playlistService.setCurrentSong(null);
    }
  }
}
