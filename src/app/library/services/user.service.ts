import { Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private baseUrl = environment.API_URL + '/api';
  private user = signal<User | null>(null);
  user$ = this.user.asReadonly();

  constructor(private httpClient: HttpClient) {}

  loadUser() {
    const user = this.getUserFromLocalStorage();
    if (user) {
      this.user.set(user);
      return user.id;
    }
    return null;
  }

  registerUser(userName: string) {
    userName = userName.toLocaleLowerCase();
    return this.httpClient
      .post<User>(this.baseUrl + '/users', { userName })
      .pipe(
        tap((user: User) => {
          this.user.set(user);
          this.setUserToLocalStorage(user);
        })
      );
  }

  resetUser() {
    this.user.set(null);
    localStorage.removeItem('user');
  }

  private getUserFromLocalStorage() {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    return JSON.parse(userData) as User;
  }

  private setUserToLocalStorage(user: User) {
    localStorage.setItem('user', JSON.stringify(user));
  }
}
