import {
  Component,
  effect,
  HostListener,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { SongsComponent } from './songs/songs.component';
import { SearchComponent } from './songs/search/search.component';
import { PlayerWrapperComponent } from './components/player-wrapper/player-wrapper.component';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { WakeService } from './services/wake.service';
import { catchError, filter, interval, map, takeWhile, tap } from 'rxjs';
import { UserService } from './library/services/user.service';
import { SettingsService } from './services/settings.service';
import { FullPlayerComponent } from './components/player-wrapper/full-player/full-player.component';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { NavigationComponent } from './components/navigation/navigation.component';
import { LibraryService } from './library/services/library.service';
import { PlayerService } from './services/player.service';
import { RemoteService } from './services/remote.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    SongsComponent,
    SearchComponent,
    PlayerWrapperComponent,
    RouterOutlet,
    FullPlayerComponent,
    NavigationComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  newUpdateAvaialble = signal(false);
  secondsToUpdate = signal(3);

  constructor(
    private title: Title,
    private playerService: PlayerService,
    private wakeService: WakeService,
    private userService: UserService,
    private settingsService: SettingsService,
    private libraryService: LibraryService,
    private swUpdate: SwUpdate,
    private remoteService: RemoteService
  ) {
    effect(() => {
      const song = this.playerService.song$();
      this.title.setTitle(song?.title || 'FindVibe');
    });

    this.setupNavigationMedia();
  }

  ngOnInit(): void {
    this.checkIfAlreadyLoggedAndLoadLibrary();
    this.checkForUpdate().subscribe();
    this.wakeServer().subscribe();
  }

  @HostListener('window:beforeunload')
  async onBeforeUnload() {
    await this.remoteService.disconnectFromServer();
  }

  private async checkIfAlreadyLoggedAndLoadLibrary() {
    const userId = this.userService.loadUserIdFromStorage();
    if (userId) {
      this.loadLibrary(userId).subscribe();
      const username = this.userService.user$()!.name;
      if (username != '') {
        await this.remoteService.connectToServer(username);
      }
    }
  }

  private loadLibrary(userId: string) {
    return this.libraryService.updateLibrarySongs(userId);
  }

  private checkForUpdate() {
    return this.swUpdate.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
      tap(() => {
        this.newUpdateAvaialble.set(true);
        this.countdown(3).subscribe((time) => {
          this.secondsToUpdate.set(time);
          if (time === 1) {
            document.location.reload();
          }
        });
      })
    );
  }

  private wakeServer() {
    this.settingsService.setIsCheckedServerPending();
    return this.wakeService.wakeServer().pipe(
      tap(() => {
        this.settingsService.setIsCheckedServerDone();
        this.settingsService.setServerUp();
      }),
      catchError((err) => {
        this.settingsService.setIsCheckedServerDone();
        this.settingsService.setServerDown();
        throw err;
      })
    );
  }

  private setupNavigationMedia() {
    // Media Session
    effect(() => {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.playerService.song$()?.title,
        artist: this.playerService.song$()?.artist,
        artwork: [
          {
            src: this.playerService.song$()?.image || '',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      });
    });

    navigator.mediaSession.setActionHandler('nexttrack', async () => {
      const song = await this.playerService.setNextSong();
      if (this.remoteService.isConnected()) {
        await this.remoteService.setSong(song!);
      }
    });

    navigator.mediaSession.setActionHandler('previoustrack', async () => {
      const song = await this.playerService.setPreviousSong();
      if (this.remoteService.isConnected()) {
        await this.remoteService.setSong(song!);
      }
    });

    navigator.mediaSession.setActionHandler('play', async () => {
      this.playerService.play();
      if (this.remoteService.isConnected()) {
        await this.remoteService.play();
      }
    });

    navigator.mediaSession.setActionHandler('pause', async () => {
      this.playerService.pause();
      if (this.remoteService.isConnected()) {
        await this.remoteService.pause();
      }
    });

    navigator.mediaSession.setActionHandler('stop', async () => {
      this.playerService.stop();
      if (this.remoteService.isConnected()) {
        await this.remoteService.pause();
      }
    });
  }

  private countdown(startTimer: number) {
    return interval(1000).pipe(
      map(() => startTimer--),
      takeWhile(() => startTimer > -1)
    );
  }
}
