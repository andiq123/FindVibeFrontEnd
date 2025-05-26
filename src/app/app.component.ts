import { Component, effect, HostListener, OnInit, signal, OnDestroy } from '@angular/core';
import { PlayerWrapperComponent } from './components/player-wrapper/player-wrapper.component';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { WakeService } from './services/wake.service';
import { catchError, filter, interval, map, takeWhile, tap, retry, timeout, of, switchMap } from 'rxjs';
import { UserService } from './library/services/user.service';
import { SettingsService } from './services/settings.service';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { NavigationComponent } from './components/navigation/navigation.component';
import { LibraryService } from './library/services/library.service';
import { PlayerService } from './services/player.service';
import { RemoteService } from './services/remote.service';
import { PlaylistService } from './services/playlist.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PlayerWrapperComponent, RouterOutlet, NavigationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  newUpdateAvaialble = signal(false);
  secondsToUpdate = signal(3);
  private connectionRetryCount = 0;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 2000;
  private connectionCheckInterval?: number;
  private isDisconnecting = false;

  constructor(
    private title: Title,
    private playerService: PlayerService,
    private playlistService: PlaylistService,
    private wakeService: WakeService,
    private userService: UserService,
    private settingsService: SettingsService,
    private libraryService: LibraryService,
    private swUpdate: SwUpdate,
    private remoteService: RemoteService
  ) {
    effect(() => {
      const song = this.playlistService.currentSong();
      this.title.setTitle(song?.title || 'FindVibe');
    });

    this.setupNavigationMedia();
  }

  ngOnInit(): void {
    this.checkIfAlreadyLoggedAndLoadLibrary();
    this.checkForUpdate().subscribe();
    this.wakeServer().subscribe();
    this.setupConnectionMonitoring();
  }

  ngOnDestroy(): void {
    this.cleanupConnectionMonitoring();
    this.disconnectFromServer();
  }

  @HostListener('window:beforeunload')
  async onBeforeUnload() {
    await this.disconnectFromServer();
  }

  @HostListener('window:online')
  onOnline() {
    this.handleOnlineStatus();
  }

  @HostListener('window:offline')
  onOffline() {
    this.handleOfflineStatus();
  }

  private setupConnectionMonitoring(): void {
    // Check connection status every 30 seconds
    this.connectionCheckInterval = window.setInterval(() => {
      this.checkConnectionStatus();
    }, 30000);
  }

  private cleanupConnectionMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
  }

  private async checkConnectionStatus(): Promise<void> {
    const username = this.userService.user$()?.username;
    if (username && !this.isDisconnecting) {
      try {
        await this.ensureConnection(username);
      } catch (error) {
        console.error('Connection check failed:', error);
      }
    }
  }

  private async handleOnlineStatus(): Promise<void> {
    const username = this.userService.user$()?.username;
    if (username && !this.isDisconnecting) {
      try {
        await this.ensureConnection(username);
      } catch (error) {
        console.error('Failed to reconnect after coming online:', error);
      }
    }
  }

  private handleOfflineStatus(): void {
    this.isDisconnecting = true;
    this.disconnectFromServer().finally(() => {
      this.isDisconnecting = false;
    });
  }

  private async ensureConnection(username: string): Promise<void> {
    if (this.connectionRetryCount >= this.MAX_RETRY_ATTEMPTS) {
      this.connectionRetryCount = 0;
      return;
    }

    try {
      await this.remoteService.connectToServer(username);
      this.connectionRetryCount = 0;
    } catch (error) {
      this.connectionRetryCount++;
      if (this.connectionRetryCount < this.MAX_RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        await this.ensureConnection(username);
      }
    }
  }

  private async disconnectFromServer(): Promise<void> {
    if (this.isDisconnecting) return;
    
    this.isDisconnecting = true;
    try {
      await this.remoteService.disconnectFromServer();
    } catch (error) {
      console.error('Error disconnecting from server:', error);
    } finally {
      this.isDisconnecting = false;
    }
  }

  private async checkIfAlreadyLoggedAndLoadLibrary() {
    const userId = this.userService.loadUserIdFromStorage();
    if (userId) {
      this.loadLibrary(userId).subscribe();
      const username = this.userService.user$()?.username;
      if (username) {
        await this.ensureConnection(username);
      }
    }
  }

  private loadLibrary(userId: string) {
    return this.libraryService.updateLibrarySongs(userId).pipe(
      retry(3),
      timeout(30000),
      catchError(error => {
        console.error('Error loading library:', error);
        return of(null);
      })
    );
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
    effect(() => {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.playlistService.currentSong()?.title,
        artist: this.playlistService.currentSong()?.artist,
        artwork: [
          {
            src: this.playlistService.currentSong()?.image || '',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      });
    });

    navigator.mediaSession.setActionHandler('nexttrack', async () => {
      await this.playerService.setNextSong();
    });

    navigator.mediaSession.setActionHandler('previoustrack', async () => {
      await this.playerService.setPreviousSong();
    });

    navigator.mediaSession.setActionHandler('play', async () => {
      await this.playerService.play();
      await this.remoteService.play();
    });

    navigator.mediaSession.setActionHandler('pause', async () => {
      this.playerService.pause();
      await this.remoteService.pause();
    });

    navigator.mediaSession.setActionHandler('stop', async () => {
      this.playerService.stop();
      await this.remoteService.pause();
    });

    navigator.mediaSession.setActionHandler('seekto', async (details) => {
      this.playerService.setCurrentTime(details.seekTime!);
      await this.remoteService.updateTime(details.seekTime!);
    });
  }

  private countdown(startTimer: number) {
    return interval(1000).pipe(
      map(() => startTimer--),
      takeWhile(() => startTimer > -1)
    );
  }
}
