import {Injectable, signal} from '@angular/core';
import {SearchStatus, Song} from './models/song.model';
import {HttpClient} from '@angular/common/http';
import {catchError, Observable, tap} from 'rxjs';
import {environment} from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class SongsService {
  private songs = signal<Song[]>([]);
  private searchStatus = signal<SearchStatus>(SearchStatus.None);
  private baseApi = environment.API_URL + "/api/songs/search?searchQuery=";
  songs$ = this.songs.asReadonly();
  status$ = this.searchStatus.asReadonly();

  constructor(private httpService: HttpClient) {
  }

  wakeServer(): Observable<void> {
    return this.httpService.get<void>(this.baseApi + 'test');
  }

  searchSongs(searchTerm: string): Observable<{ songs: Song[] }> {
    this.setStatusLoading();
    return this.httpService
      .get<{ songs: Song[] }>(this.baseApi + searchTerm)
      .pipe(
        tap((list) => {
          this.songs.set(list.songs);
          this.setStatusFinished();
        }),
        catchError((e: any) => {
          this.setStatusError();
          throw e;
        })
      );
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

  private setStatusFinished() {
    this.searchStatus.set(SearchStatus.Finished);
  }

  private setStatusLoading() {
    this.searchStatus.set(SearchStatus.Loading);
  }

  private setStatusError() {
    this.searchStatus.set(SearchStatus.Error);
  }
}
