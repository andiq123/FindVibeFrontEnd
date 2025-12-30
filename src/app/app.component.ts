import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { catchError, tap } from 'rxjs';

import { MiniPlayerComponent } from './features/player/mini-player/mini-player.component';
import { FullPlayerComponent } from './features/player/full-player/full-player.component';
import { NavigationComponent } from './features/navigation/navigation.component';
import { ConnectionStatusComponent } from './shared/connection-status/connection-status.component';
import { UpdateOverlayComponent } from './shared/update-overlay/update-overlay.component';
import { GlobalModalComponent } from './shared/components/global-modal/global-modal.component';

import { SettingsService } from './core/services/settings.service';
import { UserService } from './features/library/services/user.service';
import { AudioService } from './core/services/audio.service';
import { MediaSessionService } from './core/services/media-session.service';
import { OfflineStorageService } from './features/library/services/offline-storage.service';
import { ModalService } from './core/services/modal.service';
import { AppUpdateService } from './core/services/app-update.service';
import { WakeService } from './core/services/wake.service';
import { PlayerService } from './core/services/player.service';
import { PlaylistService } from './core/services/playlist.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    MiniPlayerComponent,
    FullPlayerComponent,
    NavigationComponent, 
    UpdateOverlayComponent, 
    ConnectionStatusComponent, 
    GlobalModalComponent, 
    CommonModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private userService = inject(UserService);
  private wakeService = inject(WakeService);
  private settingsService = inject(SettingsService);
  private updateService = inject(AppUpdateService);
  private mediaSessionService = inject(MediaSessionService);
  private audioService = inject(AudioService);
  private offlineStorageService = inject(OfflineStorageService);
  private modalService = inject(ModalService);
  private playerService = inject(PlayerService);
  private playlistService = inject(PlaylistService);

  newUpdateAvailable = this.updateService.newUpdateAvailable;
  secondsToUpdate = this.updateService.secondsToUpdate;

  isMiniPlayer = computed(() => this.settingsService.isMiniPlayer());
  isModalOpen = computed(() => this.modalService.isOpen());

  song = computed(() => this.playlistService.currentSong());
  status = this.playerService.status;
  progress = computed(() => {
    const duration = this.playerService.duration();
    return duration > 0 ? (this.playerService.currentTime() / duration) * 100 : 0;
  });



  ngOnInit(): void {
    this.initializeServices();
    this.wakeServer().subscribe();
  }

  onToggleSize() {
    this.settingsService.toggleMiniPlayer();
  }

  private initializeServices(): void {
    this.audioService.initialize();
    this.settingsService.initialize();
    this.mediaSessionService.initialize();
    this.offlineStorageService.initialize();
  }

  private wakeServer() {
    this.settingsService.setIsCheckedServerPending();
    return this.wakeService.wakeServer().pipe(
      tap(() => this.settingsService.setServerUp()),
      catchError((err) => {
        this.settingsService.setServerDown();
        throw err;
      })
    );
  }
}
