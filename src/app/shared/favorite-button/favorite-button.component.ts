import { Component, computed, input, inject, Signal } from '@angular/core';
import { faHeart as favoritedHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as unFavoritedHeart } from '@fortawesome/free-regular-svg-icons';
import { UserService } from '../../features/library/services/user.service';
import { LibraryService } from '../../features/library/services/library.service';
import { Song } from '../../core/models/song.model';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
    selector: 'app-favorite-button',
    imports: [FontAwesomeModule],
    templateUrl: './favorite-button.component.html',
    styleUrl: './favorite-button.component.scss'
})
export class FavoriteButtonComponent {
  private userService = inject(UserService);
  private libraryService = inject(LibraryService);

  forPlayer = input<boolean>(false);
  song = input.required<Song>();
  
  unFavoritedHeart = unFavoritedHeart;
  favoritedHeart = favoritedHeart;

  isLoadingFavorite = computed(() =>
    this.libraryService
      .currentLoadingFavoriteSongIds()
      .includes(this.song().id)
  );

  isAbleToAddToFav = computed(() => !!this.userService.user());

  isFavorited = computed(() =>
    this.libraryService
      .songs()
      .some((song: Song) => song.link === this.song().link)
  );

  toggleAddToFavorite() {
    const user = this.userService.user();
    if (!user) return;

    if (this.isFavorited()) {
      this.libraryService
        .removeFromFavorites(this.song().id, this.song().link)
        .subscribe();
    } else {
      this.libraryService
        .addToFavorites(this.song(), user.id)
        .subscribe();
    }
  }
}
