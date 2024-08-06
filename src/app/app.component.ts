import { Component, effect, Inject, OnInit, signal } from '@angular/core';
import { SongsComponent } from './songs/songs.component';
import { SearchComponent } from './songs/search/search.component';
import { PlayerWrapperComponent } from './components/player-wrapper/player-wrapper.component';
import { Title } from '@angular/platform-browser';
import { PlayerService } from './components/player-wrapper/player.service';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './components/navigation/navigation.component';
import { WakeService } from './services/wake.service';
import { catchError } from 'rxjs';
import { UserService } from './library/services/user.service';
import { LibraryService } from './library/services/library.service';
import { SettingsService } from './components/player-wrapper/settings.service';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    SongsComponent,
    SearchComponent,
    PlayerWrapperComponent,
    RouterOutlet,
    NavigationComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  isAwakeServer = signal<boolean>(false);
  serverIsDown = signal<boolean>(false);

  constructor(
    private title: Title,
    private playerService: PlayerService,
    private wakeService: WakeService,
    private userService: UserService,
    private libraryService: LibraryService,
    private settingsService: SettingsService,
    @Inject(DOCUMENT) private document: Document
  ) {
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
