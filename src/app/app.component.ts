import { Component, OnInit, inject } from '@angular/core';
import { AudioPlayerComponent } from './features/player/audio-player.component';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './features/navigation/navigation.component';
import { UserService } from './features/library/services/user.service';
import { LibraryService } from './features/library/services/library.service';
import { WakeService } from './core/services/wake.service';
import { SettingsService } from './core/services/settings.service';
import { AppUpdateService } from './core/services/app-update.service';
import { MediaSessionService } from './core/services/media-session.service';
import { catchError, tap, retry, timeout, of } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [AudioPlayerComponent, RouterOutlet, NavigationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private userService = inject(UserService);
  private libraryService = inject(LibraryService);
  private wakeService = inject(WakeService);
  private settingsService = inject(SettingsService);
  private updateService = inject(AppUpdateService);
  private mediaSessionService = inject(MediaSessionService);

  newUpdateAvailable = this.updateService.newUpdateAvailable;
  secondsToUpdate = this.updateService.secondsToUpdate;

  ngOnInit(): void {
    this.checkIfAlreadyLoggedAndLoadLibrary();
    this.wakeServer().subscribe();
  }

  private async checkIfAlreadyLoggedAndLoadLibrary() {
    const userId = this.userService.loadUserIdFromStorage();
    if (userId) {
      this.loadLibrary(userId).subscribe();
    }
  }

  private loadLibrary(userId: string) {
    return this.libraryService.updateLibrarySongs(userId).pipe(
      retry(3),
      timeout(30000),
      catchError(error => {
        console.error('Error loading library:', error);
        return of(null);
      })
    );
  }

  private wakeServer() {
    this.settingsService.setIsCheckedServerPending();
    return this.wakeService.wakeServer().pipe(
      tap(() => {
        this.settingsService.setIsCheckedServerDone();
        this.settingsService.setServerUp();
      }),
      catchError((err) => {
        this.settingsService.setIsCheckedServerDone();
        this.settingsService.setServerDown();
        throw err;
      })
    );
  }
}
