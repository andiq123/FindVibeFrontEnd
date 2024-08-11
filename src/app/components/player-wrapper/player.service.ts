import { Injectable, signal } from '@angular/core';
import { Song } from '../../songs/models/song.model';
import { PlayerStatus } from './models/player.model';
import { SettingsService } from '../../services/settings.service';
import { Router } from '@angular/router';
import { LibraryService } from '../../library/services/library.service';
import { SongsService } from '../../songs/services/songs.service';
import { addProxyLink } from '../../utils/utils';
import { RecentService } from '../../recent/services/recent.service';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private player = signal<HTMLAudioElement>(new Audio());
  song$ = signal<Song | null>(null);
  status$ = signal<PlayerStatus>(PlayerStatus.Stopped);
  currentTime$ = signal<number>(0);
  duration$ = signal<number>(0);
  firstError = signal<boolean>(true);
  alreadyAddedInRecents = signal<boolean>(false);

  constructor(
    private songsService: SongsService,
    private settingsService: SettingsService,
    private libraryService: LibraryService,
    private recentService: RecentService,
    private router: Router
  ) {}

  registerEvents() {
    this.player().addEventListener('loadstart', () => {
      this.status$.set(PlayerStatus.Loading);
    });

    this.player().addEventListener('loadeddata', () => {
      if (!this.firstError()) {
        this.firstError.set(true);
      }
      this.status$.set(PlayerStatus.Playing);
    });

    this.player().addEventListener('play', () => {
      if (!this.firstError()) {
        this.firstError.set(true);
      }
      this.status$.set(PlayerStatus.Playing);
    });

    this.player().addEventListener('pause', () => {
      this.status$.set(PlayerStatus.Paused);
    });

    this.player().addEventListener('ended', () => {
      this.status$.set(PlayerStatus.Ended);
      this.setNextSong();
    });

    this.player().addEventListener('error', async () => {
      if (this.firstError()) {
        this.firstError.set(false);
        this.status$.set(PlayerStatus.Loading);
        const proxiedUrl = addProxyLink(this.song$()!.link);
        const response = await fetch(proxiedUrl);
        const blob = await response.blob();
        this.player().src = URL.createObjectURL(blob);
      } else {
        this.firstError.set(true);
        this.status$.set(PlayerStatus.Error);
        this.song$.set(null);
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

    this.song$.set(song);
  }

  setCurrentTime(time: number) {
    this.player().currentTime = time;
  }

  play() {
    this.player().play();
  }

  pause() {
    this.player().pause();
  }

  stop() {
    this.player().pause();
    this.player().currentTime = 0;
  }

  async setPreviousSong() {
    if (this.currentTime$() > 5) {
      this.player().currentTime = 0;
      return;
    }

    const isLibraryRoute = this.router.url === '/library';
    const previousSong = isLibraryRoute
      ? this.libraryService.getPreviousSong(this.song$()!.id)
      : this.songsService.getPreviousSong(this.song$()!.id);
    await this.setSong(previousSong);
    this.play();
  }

  async setNextSong() {
    const isLibraryRoute = this.router.url === '/library';

    if (this.settingsService.isRepeat$()) {
      this.player().currentTime = 0;
      this.play();
      return;
    }

    let songToBePlayed: Song;
    if (this.settingsService.isShuffle$()) {
      songToBePlayed = isLibraryRoute
        ? this.libraryService.getRandomSongFromCurrentPlaylist()
        : this.songsService.getRandomSongFromCurrentPlaylist();
    } else {
      songToBePlayed = isLibraryRoute
        ? this.libraryService.getNextSong(this.song$()!.id)
        : this.songsService.getNextSong(this.song$()!.id);
    }

    await this.setSong(songToBePlayed);
    this.play();
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
