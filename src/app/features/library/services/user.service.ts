import { Injectable, signal, inject } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { User } from '../../../core/models/user.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { Subject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private baseUrl = environment.API_URL;
  private _user = signal<User | null>(null);
  user = this._user.asReadonly();
  userLoggedIn = new Subject();

  private storageService = inject(StorageService);

  constructor(private httpClient: HttpClient) {}

  loadUserIdFromStorage() {
    const user = this.storageService.getItem<User>('user');
    console.log('Loading user from storage:', user);
    if (user && user.id) {
      this._user.set(user);
      return user.id;
    }
    return null;
  }

  registerUser(userName: string) {
    userName = userName.toLocaleLowerCase();
    return this.httpClient.get<User>(this.baseUrl + '/' + userName).pipe(
      tap({
        next: (user: User) => {
          this._user.set(user);
          this.storageService.setItem('user', user);
          this.userLoggedIn.next(true);
        },
      })
    );
  }

  resetUser() {
    this._user.set(null);
    this.storageService.removeItem('user');
  }
}
