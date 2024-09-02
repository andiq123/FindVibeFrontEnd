import { computed, Injectable, signal } from '@angular/core';
import { Song } from '../songs/models/song.model';
import { PlayerStatus } from '../components/player-wrapper/models/player.model';
import { SettingsService } from './settings.service';
import { RecentService } from '../recent/services/recent.service';
import { PlaylistService } from './playlist.service';
import { StorageService } from '../library/services/storage.service';
import { addProxyLink, delayCustom, getBlobedUrl } from '../utils/utils';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private player = signal<HTMLAudioElement>(new Audio());
  private isFirstError = signal<boolean>(true);
  song$ = computed(() => this.playlistService.currentSong());
  status$ = signal<PlayerStatus>(PlayerStatus.Stopped);
  currentTime$ = signal<number>(0);
  duration$ = signal<number>(0);
  alreadyAddedInRecents = signal<boolean>(false);

  constructor(
    private settingsService: SettingsService,
    private recentService: RecentService,
    private playlistService: PlaylistService,
    private storageService: StorageService
  ) { }

  registerEvents() {
    this.player().addEventListener('playing', () => {
      this.status$.set(PlayerStatus.Playing);
    });

    this.player().addEventListener('pause', () => {
      if (this.status$() !== PlayerStatus.Loading)
        this.status$.set(PlayerStatus.Paused);
    });

    this.player().addEventListener('ended', () => {
      this.status$.set(PlayerStatus.Ended);
    });

    this.player().addEventListener('error', async () => {
      if (this.isFirstError()) {
        this.isFirstError.set(false);
        const blob = await getBlobedUrl(this.song$()!.link);
        this.player().src = blob;
        return;
      }
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
  }

  async setSong(song: Song) {
    this.isFirstError.set(true);
    this.playlistService.setCurrentSong(song);
    this.player().pause();
    this.player().currentTime = 0;
    this.status$.set(PlayerStatus.Loading);
    this.alreadyAddedInRecents.set(false);

    const offlineLink = await this.storageService.isAvalaibleOffline(song.link);
    if (offlineLink) {
      const blob = await offlineLink.blob();
      this.player().src = URL.createObjectURL(blob);
      await this.player().play();
      return;
    }

    this.player().src = song.link;
    await this.player().play();
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
      await this.play();
      return;
    }

    const previousSong = this.playlistService.previousSong;
    await this.setSong(previousSong);
    return previousSong;
  }

  async setNextSong() {
    if (this.settingsService.isRepeat$()) {
      this.player().currentTime = 0;
      await this.play();
      return;
    }

    const songToBePlayed = this.playlistService.nextSong;
    if (songToBePlayed === undefined || songToBePlayed === null) return;
    await this.setSong(songToBePlayed);
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
