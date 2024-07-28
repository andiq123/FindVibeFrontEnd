import { Injectable, signal } from '@angular/core';
import { SearchStatus, Song } from './models/song.model';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { PlayerService } from '../player-wrapper/player.service';

@Injectable({
  providedIn: 'root',
})
export class SongsService {
  private songs = signal<Song[]>([]);
  private searchStatus = signal<SearchStatus>(SearchStatus.None);
  private baseApi = environment.apiUrl + '/songs?search=';
  songs$ = this.songs.asReadonly();
  status$ = this.searchStatus.asReadonly();

  constructor(private httpService: HttpClient) {}

  searchSongs(searchTerm: string): Observable<Song[]> {
    this.setStatusLoading();
    return this.httpService.get<Song[]>(this.baseApi + searchTerm).pipe(
      tap((songs) => {
        this.songs.set(songs);
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
