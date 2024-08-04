import {Injectable} from '@angular/core';
import {environment} from "../../environments/environment.development";
import {HttpClient} from "@angular/common/http";
import {User} from "./models/user.model";
import {Song} from "../songs/models/song.model";
import {SongToAddFavorite} from "./models/songToAddFavorite.model";

@Injectable({
  providedIn: 'root'
})
export class LibraryBackService {
  private baseUrl = environment.API_URL + '/api';

  constructor(private httpClient: HttpClient) {
  }

  registerOrGetUser(userName: string) {
    return this.httpClient.post<User>(this.baseUrl + '/users', {userName});
  }

  getFavoritesSong(userId: string) {
    return this.httpClient.get<{ songs: Song[] }>(this.baseUrl + '/songs/get-favorites?userId=' + userId);
  }

  addToFavorites(song: SongToAddFavorite) {
    return this.httpClient.post(this.baseUrl + '/songs/add-favorite', song);
  }

  removeFromFavorites(userId: string) {
    return this.httpClient.delete(this.baseUrl + '/songs/remove-favorite?userId=' + userId);
  }
}
