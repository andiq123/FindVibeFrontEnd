import {Injectable, signal} from '@angular/core';
import {Song} from '../../songs/models/song.model';
import {PlayerStatus} from './models/player.model';
import {SongsService} from '../../songs/songs.service';
import {SettingsService} from './settings.service';
import {LibraryService} from "../../library/library.service";
import {Router} from "@angular/router";

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private song = signal<Song | null>(null);
  song$ = this.song.asReadonly();
  private player = signal<HTMLAudioElement>(new Audio());
  private status = signal<PlayerStatus>(PlayerStatus.Stopped);
  status$ = this.status.asReadonly();
  private currentTime = signal<number>(0);
  currentTime$ = this.currentTime.asReadonly();
  private duration = signal<number>(0);
  duration$ = this.duration.asReadonly();

  constructor(
    private songsService: SongsService,
    private settingsService: SettingsService,
    private libraryService: LibraryService,
    private router: Router
  ) {
  }

  registerEvents() {
    this.player().addEventListener('loadstart', () => {
      this.status.set(PlayerStatus.Loading);
    });

    this.player().addEventListener('loadeddata', () => {
      this.status.set(PlayerStatus.Playing);
    });

    this.player().addEventListener('play', () => {
      this.status.set(PlayerStatus.Playing);
    });

    this.player().addEventListener('pause', () => {
      this.status.set(PlayerStatus.Paused);
    });

    this.player().addEventListener('ended', () => {
      this.status.set(PlayerStatus.Ended);
      this.setNextSong();
    });

    this.player().addEventListener('error', () => {
      this.status.set(PlayerStatus.Error);
      this.song.set(null);
    });

    this.player().addEventListener('timeupdate', () => {
      this.currentTime.set(this.player().currentTime);
      this.updateDuration(this.player().duration);
    });
  }

  setSong(song: Song) {
    this.song.set(song);
    this.player().src = this.song()!.link;
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

  setPreviousSong() {
    const isLibraryRoute = this.router.url === "/library";
    const previousSong = isLibraryRoute ? this.libraryService.getPreviousSong(this.song()!.id) : this.songsService.getPreviousSong(this.song()!.id);
    this.setSong(previousSong);
    this.play();
  }

  setNextSong() {
    const isLibraryRoute = this.router.url === "/library";

    if (this.settingsService.isRepeat$()) {
      this.player().currentTime = 0;
      this.play();
      return;
    }

    let songToBePlayed: Song;
    if (this.settingsService.isShuffle$()) {
      songToBePlayed = isLibraryRoute ? this.libraryService.getRandomSongFromCurrentPlaylist() : this.songsService.getRandomSongFromCurrentPlaylist();
    } else {
      songToBePlayed = isLibraryRoute ? this.libraryService.getNextSong(this.song()!.id) : this.songsService.getNextSong(this.song()!.id);
    }

    this.setSong(songToBePlayed);
    this.play();
  }

  private updateDuration(time: number) {
    if (!this.duration()) {
      this.duration.set(time);
      return;
    }

    if (time !== this.duration()) {
      this.duration.set(time);
      return;
    }

    return;
  }
}
