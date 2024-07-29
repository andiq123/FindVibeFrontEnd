import { Component, effect } from '@angular/core';
import { SongsComponent } from './songs/songs.component';
import { SearchComponent } from './songs/search/search.component';
import { PlayerWrapperComponent } from './player-wrapper/player-wrapper.component';
import { Title } from '@angular/platform-browser';
import { PlayerService } from './player-wrapper/player.service';
import { SongsService } from './songs/songs.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SongsComponent, SearchComponent, PlayerWrapperComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor(
    private title: Title,
    private playerService: PlayerService,
    private songsService: SongsService
  ) {
    effect(() => {
      const song = this.playerService.song$();
      if (song) {
        this.title.setTitle(song.title);
        return;
      }
      this.title.setTitle('FindVibe');
    });

    this.songsService.wakeServer().subscribe();
  }
}
