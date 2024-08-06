import { Component, computed, input, OnInit, Signal } from '@angular/core';
import { faHeart as favoritedHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as unFavoritedHeart } from '@fortawesome/free-regular-svg-icons';
import { UserService } from '../../library/services/user.service';
import { LibraryService } from '../../library/services/library.service';
import { Song } from '../../songs/models/song.model';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-favorite-button',
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: './favorite-button.component.html',
  styleUrl: './favorite-button.component.scss',
})
export class FavoriteButtonComponent implements OnInit {
  forPlayer = input<boolean>(false);
  song = input.required<Song>();
  isAbleToAddToFav!: Signal<boolean>;
  isFavorited!: Signal<boolean>;

  isLoadingFavorite!: Signal<boolean>;
  unFavoritedHeart = unFavoritedHeart;
  favoritedHeart = favoritedHeart;

  constructor(
    private userService: UserService,
    private libraryService: LibraryService
  ) {}

  ngOnInit(): void {
    this.isLoadingFavorite = computed(() =>
      this.libraryService
        .currentLoadingFavoriteSongIds$()
        .includes(this.song().id)
    );
    this.isAbleToAddToFav = computed(() => {
      return !!this.userService.user$();
    });
    this.isFavorited = computed(() =>
      this.libraryService
        .songs$()
        .some((song) => song.link === this.song().link)
    );
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
