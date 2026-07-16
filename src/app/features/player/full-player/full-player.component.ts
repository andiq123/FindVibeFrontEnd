import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  inject,
  untracked,
  OnInit,
  AfterViewInit,
  OnDestroy,
  Renderer2,
  ChangeDetectionStrategy,
} from "@angular/core";
import { DOCUMENT, NgOptimizedImage } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import {
  faArrowDown,
  faChevronRight,
  faPause,
  faPlay,
  faRepeat,
  faShuffle,
  faStepBackward,
  faStepForward,
  faTriangleExclamation,
  faWaveSquare,
  faXmark,
} from "../../../shared/icons";
import { PlayerStatus, RepeatMode } from "../models/player.model";
import { SettingsService } from "../../../core/services/settings.service";
import { FavoriteButtonComponent } from "../../../shared/favorite-button/favorite-button.component";
import { SwipeDownDirective } from "../directives/swipe-down.directive";
import { PlayerService } from "../../../core/services/player.service";
import { PlaylistService } from "../../../core/services/playlist.service";
import { RadioService } from "../../../core/services/radio.service";
import { Song } from "../../../core/models/song.model";
import { MovingTitleComponent } from "../../../shared/moving-title/moving-title.component";
import { TimeFormatPipe } from "../../../shared/pipes/time-format.pipe";
import { upgradeToHttps } from "../../../core/utils/utils";
import { OfflineStorageService } from "../../library/services/offline-storage.service";
import { LibraryService } from "../../library/services/library.service";
import { environment } from "../../../../environments/environment";

const OPEN_ANIM_MS = 500;
const CLOSE_ANIM_MS = 350;

@Component({
  selector: "app-full-player",
  standalone: true,
  imports: [
    FontAwesomeModule,
    NgOptimizedImage,
    FavoriteButtonComponent,
    SwipeDownDirective,
    MovingTitleComponent,
    TimeFormatPipe,
  ],
  templateUrl: "./full-player.component.html",
  styleUrl: "./full-player.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FullPlayerComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly playerService = inject(PlayerService);
  readonly settingsService = inject(SettingsService);
  private offlineStorage = inject(OfflineStorageService);
  private libraryService = inject(LibraryService);
  readonly playlistService = inject(PlaylistService);
  readonly radioService = inject(RadioService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private openFallbackId: ReturnType<typeof setTimeout> | null = null;
  private closeFallbackId: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  song = input.required<Song>();
  status = input.required<PlayerStatus>();
  currentTime = input<number>(0);
  duration = input<number>(0);
  repeatModes = RepeatMode;
  playerStatus = PlayerStatus;
  toggleSizeEvent = output<void>();
  faStepBackward = faStepBackward;
  faStepForward = faStepForward;
  faPlay = faPlay;
  faPause = faPause;
  faRepeat = faRepeat;
  faShuffle = faShuffle;
  faTriangleExclamation = faTriangleExclamation;
  faArrowDown = faArrowDown;
  faWaveSquare = faWaveSquare;
  faXmark = faXmark;
  faChevronRight = faChevronRight;
  isDownloadingMp3 = signal(false);
  /** Up next sheet — keep mounted while closing so exit anim can finish. */
  upNextOpen = signal(false);
  upNextClosing = signal(false);
  private upNextCloseId: ReturnType<typeof setTimeout> | null = null;
  isClosingAnimation = signal(false);
  isOpeningAnimation = signal(false);
  isOpened = signal(false);
  isDraggingTime = signal(false);
  dragTime = signal(0);
  coverImage = signal("");
  coverReady = signal(false);
  /** Base layer only — overlay fades iTunes/vault fill on top. */
  displayImage = computed(() => this.song().image || "no_album_art.jpg");
  displayTime = computed(() =>
    this.isDraggingTime() ? this.dragTime() : this.currentTime(),
  );
  progressPercent = computed(() => {
    const dur = this.duration();
    if (dur <= 0) return 0;
    return Math.min(100, (this.displayTime() / dur) * 100);
  });
  private coverLink = "";

  constructor() {
    // ponytail: vault-only fill. Reset on track change only — not on library/playlist writes.
    effect((onCleanup) => {
      const s = this.song();
      if (s.link !== this.coverLink) {
        this.coverLink = s.link;
        this.coverImage.set("");
        this.coverReady.set(false);
      }
      if (s.image?.trim() || this.coverImage()) return;

      const vault = untracked(() =>
        this.libraryService.songs().find((x) => x.link === s.link),
      );
      if (!vault) return;
      if (vault.image?.trim()) {
        this.coverImage.set(vault.image);
        return;
      }

      const q = `${s.artist} ${s.title}`.trim();
      if (!q) return;
      const sub = this.http
        .get<{ image?: string }>(`${environment.API_URL}/cover`, {
          params: { q },
        })
        .subscribe({
          next: (r) => {
            if (!r?.image || this.coverLink !== s.link) return;
            this.coverImage.set(r.image);
            this.libraryService.persistSongImage(s.link, r.image);
          },
          error: () => {},
        });
      onCleanup(() => sub.unsubscribe());
    });
  }

  onCoverLoaded(): void {
    this.coverReady.set(true);
    const image = this.coverImage();
    const link = this.song().link;
    if (image && link) this.playlistService.patchSongImage(link, image);
  }

  ngOnInit() {
    this.renderer.setStyle(this.document.body, "overflow", "hidden");
  }
  ngAfterViewInit() {
    if (this.isOpened() || this.isClosingAnimation()) return;
    const startOpen = () => {
      if (this.destroyed) return;
      this.isOpeningAnimation.set(true);
      this.openFallbackId = setTimeout(() => {
        this.openFallbackId = null;
        if (!this.destroyed && this.isOpeningAnimation()) {
          this.isOpeningAnimation.set(false);
          this.isOpened.set(true);
        }
      }, OPEN_ANIM_MS);
    };
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => startOpen());
    } else {
      startOpen();
    }
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.renderer.removeStyle(this.document.body, "overflow");
    if (this.openFallbackId != null) clearTimeout(this.openFallbackId);
    if (this.closeFallbackId != null) clearTimeout(this.closeFallbackId);
    if (this.upNextCloseId != null) clearTimeout(this.upNextCloseId);
  }
  private closeAndEmit(): void {
    if (this.closeFallbackId != null) {
      clearTimeout(this.closeFallbackId);
      this.closeFallbackId = null;
    }
    this.isOpeningAnimation.set(false);
    this.isClosingAnimation.set(false);
    this.isOpened.set(false);
    this.toggleSizeEvent.emit();
  }
  onAnimationEnd(event: Event) {
    const animationEvent = event as AnimationEvent;
    const name = animationEvent.animationName ?? '';
    if (name.includes('slide-up') && this.isOpeningAnimation()) {
      if (this.openFallbackId != null) {
        clearTimeout(this.openFallbackId);
        this.openFallbackId = null;
      }
      this.isOpeningAnimation.set(false);
      this.isOpened.set(true);
    } else if (name.includes('slide-down') && this.isClosingAnimation()) {
      this.closeAndEmit();
    }
  }
  onSwipeClose(): void {
    if (this.isClosingAnimation()) return;
    this.closeAndEmit();
  }
  toggleSize(): void {
    if (this.isClosingAnimation() || this.isOpeningAnimation()) return;
    const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      this.closeAndEmit();
      return;
    }
    this.isOpeningAnimation.set(false);
    this.isClosingAnimation.set(true);
    this.closeFallbackId = setTimeout(() => {
      this.closeFallbackId = null;
      if (!this.destroyed && this.isClosingAnimation()) this.closeAndEmit();
    }, CLOSE_ANIM_MS);
  }
  async togglePlay() {
    if (this.status() === PlayerStatus.Playing) {
      this.playerService.pause();
    } else {
      await this.playerService.play();
    }
  }
  onTimeDragStart() {
    this.dragTime.set(this.currentTime());
    this.isDraggingTime.set(true);
  }
  onTimeChange(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.dragTime.set(value);
    // Live scrub — instant UI + audio, no wait for pointerup.
    this.playerService.seek(value);
  }
  onTimeDragEnd(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.playerService.seek(value);
    this.isDraggingTime.set(false);
  }
  async next() {
    await this.playerService.setNextSong();
  }
  async previous() {
    await this.playerService.setPreviousSong();
  }
  toggleRepeat() {
    this.playerService.toggleRepeat();
  }
  toggleShuffle() {
    this.playerService.toggleShuffle();
  }
  repeatLabel(): string {
    switch (this.settingsService.repeatMode()) {
      case RepeatMode.ONE:
        return "Repeat one";
      case RepeatMode.ALL:
        return "Repeat all";
      default:
        return "Repeat off";
    }
  }
  navigateToArtist() {
    const artistName = this.song().artist;
    if (artistName) {
      this.toggleSize();
      this.router.navigate(["/songs", artistName]);
    }
  }
  toggleUpNext(): void {
    if (this.upNextOpen() || this.upNextClosing()) this.closeUpNext();
    else this.openUpNext();
  }

  openUpNext(): void {
    if (!this.playlistService.upcoming().length) return;
    if (this.upNextCloseId != null) {
      clearTimeout(this.upNextCloseId);
      this.upNextCloseId = null;
    }
    this.upNextClosing.set(false);
    this.upNextOpen.set(true);
  }

  closeUpNext(): void {
    if (!this.upNextOpen() || this.upNextClosing()) return;
    this.upNextClosing.set(true);
    this.upNextCloseId = setTimeout(() => {
      this.upNextCloseId = null;
      if (this.destroyed) return;
      this.upNextOpen.set(false);
      this.upNextClosing.set(false);
    }, 280);
  }

  onUpNextAnimEnd(event: AnimationEvent): void {
    if (!this.upNextClosing()) return;
    if (!(event.animationName ?? "").includes("up-next-sheet-out")) return;
    if (this.upNextCloseId != null) {
      clearTimeout(this.upNextCloseId);
      this.upNextCloseId = null;
    }
    this.upNextOpen.set(false);
    this.upNextClosing.set(false);
  }

  async startRadio() {
    const current = this.song();
    const ok = await this.radioService.start(current);
    if (!ok) return;
    this.openUpNext();
    if (this.status() !== PlayerStatus.Playing) {
      await this.playerService.setSong(current);
    }
  }

  async playUpcoming(song: Song) {
    await this.playerService.setSong(song);
  }

  async downloadMp3() {
    if (this.isDownloadingMp3()) return;
    const song = this.song();
    const url = upgradeToHttps(song.link);
    if (!url) return;

    const filename = mp3Filename(song.artist, song.title);
    this.isDownloadingMp3.set(true);
    try {
      const res = await fetch(url, { mode: "cors", credentials: "omit" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const forVault = res.clone();
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      triggerFileDownload(objectUrl, filename);
      URL.revokeObjectURL(objectUrl);
      void this.offlineStorage.rememberResponse(song, forVault);
    } catch {
      // CORS: file via direct URL; still try vault with no-cors path.
      triggerFileDownload(url, filename);
      void this.offlineStorage.cacheSong(song);
    } finally {
      if (!this.destroyed) this.isDownloadingMp3.set(false);
    }
  }
}

function mp3Filename(artist: string, title: string): string {
  const base = `${artist} - ${title}`
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `${base || "track"}.mp3`;
}

function triggerFileDownload(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  a.click();
}
