import {
  Component,
  computed,
  input,
  OnInit,
  signal,
  Signal,
} from '@angular/core';
import { Song } from '../models/song.model';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PlayerService } from '../../components/player-wrapper/player.service';
import { PlayerStatus } from '../../components/player-wrapper/models/player.model';
import { PlayerButtonComponent } from '../../shared/player-button/player-button.component';
import { MovingTitleComponent } from '../../shared/moving-title/moving-title.component';
import { NgOptimizedImage } from '@angular/common';
import { faHeart as favoritedHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as unFavoritedHeart } from '@fortawesome/free-regular-svg-icons';
import { LibraryService } from '../../library/services/library.service';
import { UserService } from '../../library/services/user.service';

@Component({
  selector: 'app-song',
  standalone: true,
  imports: [
    FontAwesomeModule,
    PlayerButtonComponent,
    MovingTitleComponent,
    NgOptimizedImage,
  ],
  templateUrl: './song.component.html',
  styleUrl: './song.component.scss',
})
export class SongComponent implements OnInit {
  song = input.required<Song>();
  isActive!: Signal<boolean>;
  isFavorited!: Signal<boolean>;
  status!: Signal<PlayerStatus>;
  isAbleToAddToFav!: Signal<boolean>;

  isLoadingFavorite!: Signal<boolean>;
  unFavoritedHeart = unFavoritedHeart;
  favoritedHeart = favoritedHeart;

  constructor(
    private playerService: PlayerService,
    private libraryService: LibraryService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.isActive = computed(
      () => this.playerService.song$()?.link === this.song().link
    );
    this.isFavorited = computed(() =>
      this.libraryService
        .songs$()
        .some((song) => song.link === this.song().link)
    );
    this.status = computed(() => {
      if (this.isActive()) {
        return this.playerService.status$();
      }
      return PlayerStatus.Paused;
    });
    this.isAbleToAddToFav = computed(() => {
      return !!this.userService.user$();
    });

    this.isLoadingFavorite = computed(() =>
      this.libraryService
        .currentLoadingFavoriteSongIds$()
        .includes(this.song().id)
    );
  }

  play() {
    if (this.isActive()) {
      this.playerService.play();
      return;
    }
    this.playerService.setSong(this.song());
    this.playerService.play();
  }

  pause() {
    this.playerService.pause();
  }

  toggleAddToFavorite() {
    if (this.isFavorited()) {
      this.libraryService.removeFromFavorites(this.song().id, this.song().link);
    } else {
      this.libraryService.addToFavorites(
        this.song(),
        this.userService.user$()!.id
      );
    }
  }
}
