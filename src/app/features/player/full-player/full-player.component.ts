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
  faArrowUp,
  faChevronRight,
  faPause,
  faPlay,
  faRepeat,
  faShuffle,
  faStepBackward,
  faStepForward,
  faMusic,
  faTrash,
  faTriangleExclamation,
  faWaveSquare,
  faXmark,
} from "../../../shared/icons";
import { firstValueFrom } from "rxjs";
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
import { HapticsService } from "../../../core/services/haptics.service";
import { ToastService } from "../../../core/services/toast.service";
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
  private readonly haptics = inject(HapticsService);
  private readonly toast = inject(ToastService);
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
  faArrowUp = faArrowUp;
  faWaveSquare = faWaveSquare;
  faMusic = faMusic;
  faXmark = faXmark;
  faChevronRight = faChevronRight;
  faTrash = faTrash;
  isDownloadingMp3 = signal(false);
  similarOpen = signal(false);
  similarLoading = signal(false);
  similarArtists = signal<string[]>([]);
  private similarArtistKey = "";
  /** Bottom sheets — stay mounted while closing so exit anim can finish. */
  upNextOpen = signal(false);
  upNextClosing = signal(false);
  private upNextCloseId: ReturnType<typeof setTimeout> | null = null;
  lyricsOpen = signal(false);
  lyricsClosing = signal(false);
  lyricsLoading = signal(false);
  /** Soft empty (404) vs hard failure (network/upstream). */
  lyricsError = signal("");
  lyricsErrorHard = signal(false);
  lyricsText = signal("");
  private lyricsKey = "";
  private lyricsCloseId: ReturnType<typeof setTimeout> | null = null;
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
    // ponytail: vault art first, else iTunes /cover. Reset on track change only.
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
      if (vault?.image?.trim()) {
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
            // only favorites live in DB — never PATCH search-only tracks
            if (vault) this.libraryService.persistSongImage(s.link, r.image);
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
    // in-memory queue / Media Session only — DB persist stays vault-gated above
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
    if (this.lyricsCloseId != null) clearTimeout(this.lyricsCloseId);
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
    this.haptics.light();
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
    this.haptics.light();
    await this.playerService.setNextSong();
  }
  async previous() {
    this.haptics.light();
    await this.playerService.setPreviousSong();
  }
  toggleRepeat() {
    this.haptics.selection();
    this.playerService.toggleRepeat();
  }
  toggleShuffle() {
    this.haptics.selection();
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
    void this.openSimilar();
  }

  async openSimilar(): Promise<void> {
    const artist = this.song().artist?.trim();
    if (!artist) return;
    this.closeUpNext();
    this.closeLyrics();
    this.similarOpen.set(true);
    if (artist === this.similarArtistKey && this.similarArtists().length) return;
    this.similarArtistKey = artist;
    this.similarLoading.set(true);
    this.similarArtists.set([]);
    try {
      const r = await firstValueFrom(
        this.http.get<{ artists?: string[] }>(
          `${environment.API_URL}/similar-artists`,
          { params: { artist } },
        ),
      );
      if (!this.destroyed && this.similarArtistKey === artist) {
        this.similarArtists.set(r?.artists ?? []);
      }
    } catch {
      if (!this.destroyed && this.similarArtistKey === artist) {
        this.similarArtists.set([]);
      }
    } finally {
      if (!this.destroyed && this.similarArtistKey === artist) {
        this.similarLoading.set(false);
      }
    }
  }

  closeSimilar(): void {
    this.similarOpen.set(false);
  }

  searchArtist(name: string): void {
    if (!name) return;
    this.closeSimilar();
    this.toggleSize();
    void this.router.navigate(["/songs", name]);
  }

  searchCurrentArtist(): void {
    this.searchArtist(this.song().artist);
  }

  removeUpcoming(track: Song, event: Event): void {
    event.stopPropagation();
    this.playlistService.removeUpcoming(track.link);
    this.haptics.selection();
    if (!this.playlistService.upcoming().length) this.closeUpNext();
  }

  clearUpcoming(event: Event): void {
    event.stopPropagation();
    this.playlistService.clearUpcoming();
    this.haptics.selection();
    this.closeUpNext();
  }

  moveUpcoming(track: Song, dir: -1 | 1, event: Event): void {
    event.stopPropagation();
    this.playlistService.moveUpcoming(track.link, dir);
    this.haptics.selection();
  }
  toggleUpNext(): void {
    if (this.upNextOpen() || this.upNextClosing()) this.closeUpNext();
    else this.openUpNext();
  }

  openUpNext(): void {
    if (!this.playlistService.upcoming().length) return;
    this.closeLyrics();
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

  toggleLyrics(): void {
    if (this.lyricsOpen() || this.lyricsClosing()) this.closeLyrics();
    else void this.openLyrics();
  }

  retryLyrics(): void {
    this.lyricsKey = "";
    this.lyricsError.set("");
    this.lyricsErrorHard.set(false);
    this.lyricsText.set("");
    void this.openLyrics();
  }

  async openLyrics(): Promise<void> {
    this.closeUpNext();
    if (this.lyricsCloseId != null) {
      clearTimeout(this.lyricsCloseId);
      this.lyricsCloseId = null;
    }
    this.lyricsClosing.set(false);
    this.lyricsOpen.set(true);

    const s = this.song();
    const key = `${s.artist}\0${s.title}`;
    if (key === this.lyricsKey && (this.lyricsText() || this.lyricsError())) {
      this.haptics.ready(); // sheet reopened with content already in hand
      return;
    }

    this.lyricsKey = key;
    this.lyricsText.set("");
    this.lyricsError.set("");
    this.lyricsErrorHard.set(false);

    // Vault cache — only after user opened lyrics once; never prefetch.
    const cached =
      this.libraryService.songs().find((x) => x.link === s.link)?.lyrics?.trim() ||
      s.lyrics?.trim();
    if (cached) {
      this.lyricsText.set(cached);
      this.haptics.ready();
      return;
    }

    this.lyricsLoading.set(true);
    try {
      const r = await firstValueFrom(
        this.http.get<{ lyrics?: string }>(`${environment.API_URL}/lyrics`, {
          params: { artist: s.artist, title: s.title },
        }),
      );
      if (this.destroyed || this.lyricsKey !== key) return;
      const text = r?.lyrics?.trim();
      if (!text) {
        this.lyricsError.set("No lyrics for this track");
        this.haptics.ready();
        return;
      }
      this.lyricsText.set(text);
      this.libraryService.persistSongLyrics(s.link, text);
      this.haptics.ready();
    } catch (e: unknown) {
      if (this.destroyed || this.lyricsKey !== key) return;
      const err = e as {
        error?: { error?: string; code?: string };
        status?: number;
      };
      const status = err?.status ?? 0;
      const code = err?.error?.code;
      const msg = err?.error?.error;
      if (status === 0) {
        this.lyricsErrorHard.set(true);
        this.lyricsError.set("Can't reach the server");
        this.haptics.warnOnce(`lyrics:${key}`);
      } else if (status >= 500 || code === "upstream") {
        this.lyricsErrorHard.set(true);
        this.lyricsError.set(msg || "Couldn't reach lyrics service");
        this.haptics.warnOnce(`lyrics:${key}`);
      } else {
        // 404 not_found / instrumental — calm empty state, not an alarm.
        this.lyricsErrorHard.set(false);
        this.lyricsError.set(msg || "No lyrics for this track");
        this.haptics.ready();
      }
    } finally {
      if (!this.destroyed && this.lyricsKey === key) {
        this.lyricsLoading.set(false);
      }
    }
  }

  closeLyrics(): void {
    if (!this.lyricsOpen() || this.lyricsClosing()) return;
    this.lyricsClosing.set(true);
    this.lyricsCloseId = setTimeout(() => {
      this.lyricsCloseId = null;
      if (this.destroyed) return;
      this.lyricsOpen.set(false);
      this.lyricsClosing.set(false);
    }, 280);
  }

  onLyricsAnimEnd(event: AnimationEvent): void {
    if (!this.lyricsClosing()) return;
    if (!(event.animationName ?? "").includes("up-next-sheet-out")) return;
    if (this.lyricsCloseId != null) {
      clearTimeout(this.lyricsCloseId);
      this.lyricsCloseId = null;
    }
    this.lyricsOpen.set(false);
    this.lyricsClosing.set(false);
  }

  async startRadio() {
    const current = this.song();
    const ok = await this.radioService.start(current);
    if (!ok) return;
    this.haptics.success();
    this.toast.show("Radio queued");
    if (this.status() !== PlayerStatus.Playing) {
      await this.playerService.setSong(current);
    }
  }

  async playUpcoming(song: Song) {
    this.haptics.light();
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
      this.haptics.success();
    } catch {
      // CORS: file via direct URL; still try vault with no-cors path.
      triggerFileDownload(url, filename);
      this.haptics.success();
      void this.offlineStorage.cacheSong(song, { silent: true });
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
