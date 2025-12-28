import { Component, OnInit, inject } from '@angular/core';
import { AudioPlayerComponent } from './features/player/audio-player.component';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './features/navigation/navigation.component';
import { UserService } from './features/library/services/user.service';
import { WakeService } from './core/services/wake.service';
import { SettingsService } from './core/services/settings.service';
import { AppUpdateService } from './core/services/app-update.service';
import { MediaSessionService } from './core/services/media-session.service';
import { AudioService } from './core/services/audio.service';
import { OfflineStorageService } from './features/library/services/offline-storage.service';
import { GestureService } from './core/services/gesture.service';
import { catchError, tap } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [AudioPlayerComponent, RouterOutlet, NavigationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private userService = inject(UserService);
  private wakeService = inject(WakeService);
  private settingsService = inject(SettingsService);
  private updateService = inject(AppUpdateService);
  private mediaSessionService = inject(MediaSessionService);
  private audioService = inject(AudioService);
  private offlineStorageService = inject(OfflineStorageService);
  private gestureService = inject(GestureService);

  newUpdateAvailable = this.updateService.newUpdateAvailable;
  secondsToUpdate = this.updateService.secondsToUpdate;

  ngOnInit(): void {
    this.initializeServices();
    this.wakeServer().subscribe();
  }

  private initializeServices(): void {
    this.userService.initialize();
    this.audioService.initialize();
    this.settingsService.initialize();
    this.mediaSessionService.initialize();
    this.offlineStorageService.initialize();
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
