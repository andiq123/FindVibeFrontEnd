import {Injectable, signal} from '@angular/core';
import {Song} from "../songs/models/song.model";
import {LibraryBackService} from "./library-back.service";
import {User} from "./models/user.model";
import {catchError} from "rxjs";
import {SongToAddFavorite} from "./models/songToAddFavorite.model";

@Injectable({
  providedIn: 'root'
})
export class LibraryService {
  private songs = signal<Song[]>([]);
  songs$ = this.songs.asReadonly();
  private user = signal<User | undefined>(undefined);
  user$ = this.user.asReadonly();

  constructor(private libraryBackService: LibraryBackService) {
    this.setupUser();
    if (this.user()) {
      this.setupLibrarySongs();
    }
  }

  registerOrGetUser(userName: string) {
    this.libraryBackService.registerOrGetUser(userName).subscribe((user: User) => {
      this.user.set(user);
      this.setUserToLocalStorage(user);
      this.setupLibrarySongs();
    });
  }

  setupUser() {
    const user = localStorage.getItem('user');
    if (user) {
      this.user.set(JSON.parse(user));
    }
  }

  resetUser() {
    this.user.set(undefined);
    localStorage.removeItem("user");
  }

  setupLibrarySongs() {
    this.libraryBackService.getFavoritesSong(this.user$()!.id).pipe(catchError(err => {
      this.songs.set([]);
      throw err;
    })).subscribe(data => {
      this.songs.set(data.songs);
    })
  }

  addToFavorites(song: Song) {
    const favoriteSong: SongToAddFavorite = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      image: song.image,
      link: song.link,
      userId: this.user()!.id
    }
    this.libraryBackService.addToFavorites(favoriteSong).subscribe(() => {
      this.songs.update(prevSongs => [...prevSongs, song]);

    });
  }

  removeFromFavorites(link: string) {
    const songId = this.songs().find(x => x.link === link)!.id;
    this.libraryBackService.removeFromFavorites(songId).pipe().subscribe(() => {
      this.songs.update(prevSongs => prevSongs.filter(song => song.link !== link));
    });
  }

  getPreviousSong(currentSongId: string): Song {
    const songIndex = this.songs().findIndex(
      (song) => song.id === currentSongId
    );

    if (songIndex === -1) {
      return this.songs()[0];
    }

    return this.songs()[
    (songIndex - 1 + this.songs().length) % this.songs().length
      ];
  }

  getNextSong(currentSongId: string): Song {
    const songIndex = this.songs().findIndex(
      (song) => song.id === currentSongId
    );

    if (songIndex === -1) {
      return this.songs()[0];
    }

    return this.songs()[(songIndex + 1) % this.songs().length];
  }

  getRandomSongFromCurrentPlaylist(): Song {
    return this.songs()[Math.floor(Math.random() * this.songs().length)];
  }

  private setUserToLocalStorage(user: User) {
    localStorage.setItem('user', JSON.stringify(user));
  }
}
