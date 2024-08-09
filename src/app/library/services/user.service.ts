import { Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { delay, Subject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private baseUrl = environment.API_URL + '/api';
  private user = signal<User | null>(null);
  user$ = this.user.asReadonly();
  userLoggedIn = new Subject();

  constructor(private httpClient: HttpClient) {}

  loadUserIdFromStorage() {
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
        tap({
          next: (user: User) => {
            this.user.set(user);
            this.setUserToLocalStorage(user);
            this.userLoggedIn.next(true);
          },
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
