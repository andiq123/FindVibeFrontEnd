import { Component, effect, Inject, OnInit, signal } from '@angular/core';
import { SongsComponent } from './songs/songs.component';
import { SearchComponent } from './songs/search/search.component';
import { PlayerWrapperComponent } from './components/player-wrapper/player-wrapper.component';
import { Title } from '@angular/platform-browser';
import { PlayerService } from './components/player-wrapper/player.service';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './components/navigation/navigation.component';
import { WakeService } from './services/wake.service';
import { catchError, filter } from 'rxjs';
import { UserService } from './library/services/user.service';
import { LibraryService } from './library/services/library.service';
import { SettingsService } from './components/player-wrapper/settings.service';
import { DOCUMENT } from '@angular/common';
import { FullPlayerComponent } from './components/player-wrapper/full-player/full-player.component';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    SongsComponent,
    SearchComponent,
    PlayerWrapperComponent,
    RouterOutlet,
    NavigationComponent,
    FullPlayerComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  onToggleSize() {}
  isAwakeServer = signal<boolean>(false);
  serverIsDown = signal<boolean>(false);
  siteIsOffline = signal<boolean>(false);

  constructor(
    private title: Title,
    private playerService: PlayerService,
    private wakeService: WakeService,
    private userService: UserService,
    private libraryService: LibraryService,
    private settingsService: SettingsService,
    private swUpdate: SwUpdate,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.siteIsOffline.set(navigator.onLine === false);

    swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
      )
      .subscribe(() => {
        document.location.reload();
      });

    effect(() => {
      const isMiniPlayer = this.settingsService.isMiniPlayer$();
      const body = this.document.querySelector('body');
      body?.classList.toggle('noScroll', !isMiniPlayer);
    });

    effect(() => {
      const song = this.playerService.song$();
      if (song) {
        this.title.setTitle(song.title);
        return;
      }
      this.title.setTitle('FindVibe');
    });

    // Media Session
    effect(() => {
      if (!this.playerService.song$()) return;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.playerService.song$()?.title,
        artist: this.playerService.song$()?.artist,
        artwork: [
          {
            src: this.playerService.song$()!.image,
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      });
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      this.playerService.setNextSong();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      this.playerService.setPreviousSong();
    });

    navigator.mediaSession.setActionHandler('play', () => {
      this.playerService.play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      this.playerService.pause();
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      this.playerService.stop();
    });
  }

  ngOnInit(): void {
    this.wakeServer().subscribe(() => {
      this.isAwakeServer.set(true);
      this.loadUserAndSongs();
    });
  }

  private wakeServer() {
    return this.wakeService.wakeServer().pipe(
      catchError((err) => {
        this.isAwakeServer.set(false);
        this.serverIsDown.set(true);
        throw err;
      })
    );
  }

  private loadUserAndSongs() {
    const userId = this.userService.loadUser();
    if (userId) {
      this.libraryService.setupLibrarySongs(userId).subscribe();
    }
  }
}
