import {
  Component,
  computed,
  OnInit,
  signal,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { OfflineStorageService } from "../../services/offline-storage.service";
import { LibraryService } from "../../services/library.service";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { faTrash, faCloudArrowDown } from "../../../../shared/icons";
import { Song } from "../../../../core/models/song.model";
import { ModalService } from "../../../../core/services/modal.service";
import { SettingsService } from "../../../../core/services/settings.service";

@Component({
  selector: "app-storage-info",
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: "./storage-info.component.html",
  styleUrl: "./storage-info.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageInfoComponent implements OnInit {
  private offlineStorageService = inject(OfflineStorageService);
  private libraryService = inject(LibraryService);
  private modalService = inject(ModalService);
  private settingsService = inject(SettingsService);

  storageTotal = this.offlineStorageService.storageTotal;
  storageUsed = this.offlineStorageService.storageUsed;
  loadingDownloading = signal<boolean>(false);
  loadingClearing = signal<boolean>(false);

  showRemoveCacheButton = computed(() => {
    return this.offlineStorageService.availableOfflineSongIds().length > 0;
  });

  faTrash = faTrash;
  faCloudArrowDown = faCloudArrowDown;

  ngOnInit(): void {
    this.offlineStorageService.setUpStorage();
    this.populateAvailableOfflineSongs();
  }

  close() {
    this.modalService.close();
  }

  async downloadAll(): Promise<void> {
    try {
      this.loadingDownloading.set(true);
      await this.offlineStorageService.cacheAllSongs(
        this.libraryService.songs(),
      );
      this.populateAvailableOfflineSongs();
    } catch (error) {
      console.error("[StorageInfo] Failed to download songs:", error);
    } finally {
      this.loadingDownloading.set(false);
    }
  }

  async removeCache(): Promise<void> {
    try {
      this.loadingClearing.set(true);
      await this.offlineStorageService.removeCache();
      this.populateAvailableOfflineSongs();
    } catch (error) {
      console.error("[StorageInfo] Failed to clear cache:", error);
    } finally {
      this.loadingClearing.set(false);
    }
  }

  private async populateAvailableOfflineSongs(): Promise<void> {
    const songs = this.libraryService.songs();
    await Promise.all(
      songs.map(async (song: Song) => {
        const isAvailable = await this.offlineStorageService.isAvailableOffline(
          song.link,
        );
        if (isAvailable) {
          this.offlineStorageService.addAvailableOfflineSongId(song.id);
        }
      }),
    );
  }
}
