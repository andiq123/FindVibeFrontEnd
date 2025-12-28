import { Injectable, signal, inject } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { User } from '../../../core/models/user.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { Subject, tap } from 'rxjs';
import { LibraryApiService } from './library-api.service';
import { OfflineStorageService } from './offline-storage.service';

const USER_STORAGE_KEY = 'user';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly storageService = inject(StorageService);
  private readonly httpClient = inject(HttpClient);
  private readonly libraryApiService = inject(LibraryApiService);
  private readonly offlineStorageService = inject(OfflineStorageService);

  private readonly _user = signal<User | null>(null);

  readonly user = this._user.asReadonly();
  readonly userLoggedIn = new Subject<void>();

  initialize(): void {
    this.loadUserIdFromStorage();
  }

  loadUserIdFromStorage(): string | null {
    const user = this.storageService.getItem<User>(USER_STORAGE_KEY);

    if (user?.id) {
      this._user.set(user);
      return user.id;
    }

    return null;
  }

  registerUser(userName: string) {
    const normalizedUserName = userName.toLowerCase();
    const url = `${environment.API_URL}/${normalizedUserName}`;

    return this.httpClient.get<User>(url).pipe(
      tap({
        next: (user: User) => {
          this._user.set(user);
          this.storageService.setItem(USER_STORAGE_KEY, user);
          this.userLoggedIn.next();
        },
      })
    );
  }

  resetUser(): void {
    this._user.set(null);
    this.storageService.removeItem(USER_STORAGE_KEY);
    this.libraryApiService.clearLibraryFromLocalStorage();
    this.offlineStorageService.removeCache().catch(err => 
      console.error('[UserService] Failed to clear offline storage:', err)
    );
  }
}
