import {
  Component,
  computed,
  input,
  OnInit,
  signal,
  Signal,
} from '@angular/core';
import { Song } from '../models/song.model';
import { PlayerService } from '../../components/player-wrapper/player.service';
import { PlayerStatus } from '../../components/player-wrapper/models/player.model';
import { PlayerButtonComponent } from '../../shared/player-button/player-button.component';
import { MovingTitleComponent } from '../../shared/moving-title/moving-title.component';
import { NgOptimizedImage } from '@angular/common';
import { FavoriteButtonComponent } from '../../shared/favorite-button/favorite-button.component';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { addHerokutoLink } from '../../utils/utils';

@Component({
  selector: 'app-song',
  standalone: true,
  imports: [
    PlayerButtonComponent,
    MovingTitleComponent,
    NgOptimizedImage,
    FavoriteButtonComponent,
    FontAwesomeModule,
  ],
  templateUrl: './song.component.html',
  styleUrl: './song.component.scss',
})
export class SongComponent implements OnInit {
  song = input.required<Song>();
  status = computed(() => {
    if (this.isActive()) {
      return this.playerService.status$();
    }
    return PlayerStatus.Paused;
  });
  isActive = computed(
    () => this.playerService.song$()?.link === this.song().link
  );
  isFavoritePage = input<boolean>(false);

  faCheck = faCheck;

  constructor(private playerService: PlayerService) {}

  ngOnInit(): void {
    if (this.isFavoritePage()) {
      this.checkIfAvailableOffline();
    }
  }

  async play() {
    if (this.isActive()) {
      this.playerService.play();
      return;
    }
    await this.playerService.setSong(this.song());
    this.playerService.play();
  }

  pause() {
    this.playerService.pause();
  }

  async checkIfAvailableOffline() {
    const songCache = await caches.open('library');
    const proxiedUrl = addHerokutoLink(this.song().link);
    const isAvailable = await songCache.match(proxiedUrl);
    this.song().downloaded = !!isAvailable;
  }
}
