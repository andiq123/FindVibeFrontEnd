import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from "@angular/core";
import { DecimalPipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { PageContentComponent } from "../../shared/components/page-content/page-content.component";
import { StorageInfoComponent } from "../library/components/storage-info/storage-info.component";
import { UserService } from "../library/services/user.service";
import { PlayerService } from "../../core/services/player.service";
import {
  SettingsService,
  SuggestRegion,
} from "../../core/services/settings.service";
import {
  HapticsService,
  HapticPreset,
} from "../../core/services/haptics.service";
import { StorageService } from "../../core/services/storage.service";
import { ToastService } from "../../core/services/toast.service";
import { ExploreService } from "../explore/explore.service";
import { environment } from "../../../environments/environment";
import {
  faCircleNotch,
  faCheckCircle,
  faTriangleExclamation,
  faRightFromBracket,
} from "../../shared/icons";

interface SourceStatus {
  name: string;
  host: string;
  ok: boolean;
  ms: number;
}

interface SourcesResponse {
  sources: SourceStatus[];
}

@Component({
  selector: "app-settings-page",
  standalone: true,
  imports: [
    PageContentComponent,
    StorageInfoComponent,
    FontAwesomeModule,
    DecimalPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-content>
      <div class="space-y-4 pt-1 max-w-xl mx-auto">
        <header>
          <h1 class="text-2xl font-bold tracking-tight leading-none">
            Settings
          </h1>
        </header>

        <section class="premium-card p-3.5" aria-label="Offline vault">
          <app-storage-info />
        </section>

        <section class="premium-card p-3.5 space-y-3" aria-label="Player">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <h2 class="text-sm font-bold tracking-tight">Download button</h2>
              <p class="text-[11px] text-base-content/45 mt-0.5">
                Show Save MP3 on the full player.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              class="shrink-0 w-11 h-6 rounded-full transition-colors relative"
              [class.bg-primary]="showPlayerDownload()"
              [class.bg-base-content/15]="!showPlayerDownload()"
              [attr.aria-checked]="showPlayerDownload()"
              aria-label="Show download button in full player"
              (click)="toggleShowPlayerDownload()"
            >
              <span
                class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-base-100 transition-transform"
                [class.translate-x-5]="showPlayerDownload()"
              ></span>
            </button>
          </div>
          <div class="flex items-center justify-between gap-3 pt-1 border-t border-base-content/8">
            <div class="min-w-0">
              <h2 class="text-sm font-bold tracking-tight">Haptics</h2>
              <p class="text-[11px] text-base-content/45 mt-0.5">
                Tap feedback via vibrate (Android) or iOS switch fallback.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              class="shrink-0 w-11 h-6 rounded-full transition-colors relative"
              [class.bg-primary]="hapticsEnabled()"
              [class.bg-base-content/15]="!hapticsEnabled()"
              [attr.aria-checked]="hapticsEnabled()"
              aria-label="Enable haptics"
              (click)="toggleHaptics()"
            >
              <span
                class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-base-100 transition-transform"
                [class.translate-x-5]="hapticsEnabled()"
              ></span>
            </button>
          </div>
          <div class="flex items-center justify-between gap-3 pt-1 border-t border-base-content/8">
            <div class="min-w-0">
              <h2 class="text-sm font-bold tracking-tight">Clear history</h2>
              <p class="text-[11px] text-base-content/45 mt-0.5">
                Remove local listen history ({{ recentCount() }} tracks).
              </p>
            </div>
            <button
              type="button"
              class="shrink-0 h-8 px-2.5 rounded-lg text-xs font-semibold text-error/80 active:bg-error/10 disabled:opacity-40"
              [disabled]="!recentCount()"
              (click)="clearHistory()"
            >
              Clear
            </button>
          </div>
          <div class="flex items-center justify-between gap-3 pt-1 border-t border-base-content/8">
            <div class="min-w-0">
              <h2 class="text-sm font-bold tracking-tight">Refresh Explore</h2>
              <p class="text-[11px] text-base-content/45 mt-0.5">
                Re-fetch charts + personalized shelves (bypasses 24h cache).
              </p>
            </div>
            <button
              type="button"
              class="shrink-0 h-8 px-2.5 rounded-lg text-xs font-semibold text-primary active:bg-primary/10 disabled:opacity-40"
              [disabled]="exploreRefreshing()"
              (click)="refreshExplore()"
            >
              @if (exploreRefreshing()) {
                Refreshing…
              } @else {
                Refresh
              }
            </button>
          </div>
        </section>

        <section class="premium-card p-3.5 space-y-3" aria-label="Haptics test">
          <div>
            <h2 class="text-sm font-bold tracking-tight">Haptics test</h2>
            <p class="text-[11px] text-base-content/45 mt-0.5">
              @if (hasVibrateApi) {
                Vibration API — Android Chrome path.
              } @else if (isAppleTouch) {
                iOS switch fallback (no Vibration API). Feel taps on device;
                silent if iOS 26.5+ patched programmatic click.
              } @else {
                No vibrate here — test uses a short click sound.
              }
            </p>
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-medium text-base-content/60"
                >Intensity</span
              >
              <span class="text-xs font-semibold tabular-nums text-primary">{{
                hapticIntensity() | number: "1.0-2"
              }}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              class="range range-primary range-xs w-full"
              [value]="hapticIntensity()"
              (input)="onHapticIntensity($event)"
              aria-label="Haptic intensity"
            />
            <div
              class="flex justify-between text-[10px] text-base-content/35 px-0.5"
            >
              <span>Soft</span>
              <span>Max</span>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-1.5">
            @for (p of hapticPresets; track p.id) {
              <button
                type="button"
                class="h-9 rounded-lg bg-base-content/[0.06] text-[11px] font-semibold text-base-content/70 active:scale-[0.96] active:bg-primary/20 active:text-primary transition-colors"
                (click)="testHaptic(p.id)"
              >
                {{ p.label }}
              </button>
            }
          </div>
        </section>

        <section class="premium-card p-3.5 space-y-2.5" aria-label="Suggestions">
          <div>
            <h2 class="text-sm font-bold tracking-tight">Suggestion region</h2>
            <p class="text-[11px] text-base-content/45 mt-0.5">
              Music autocomplete bias. Default Romania.
            </p>
          </div>
          <div
            class="grid grid-cols-2 gap-1 p-1 rounded-xl bg-base-content/[0.06]"
            role="group"
            aria-label="Suggestion region"
          >
            <button
              type="button"
              class="h-9 rounded-lg text-xs font-semibold transition-colors"
              [class.bg-base-100]="suggestRegion() === 'ro'"
              [class.text-base-content]="suggestRegion() === 'ro'"
              [class.text-base-content/50]="suggestRegion() !== 'ro'"
              (click)="setSuggestRegion('ro')"
            >
              Romania
            </button>
            <button
              type="button"
              class="h-9 rounded-lg text-xs font-semibold transition-colors"
              [class.bg-base-100]="suggestRegion() === 'device'"
              [class.text-base-content]="suggestRegion() === 'device'"
              [class.text-base-content/50]="suggestRegion() !== 'device'"
              (click)="setSuggestRegion('device')"
            >
              My device
            </button>
          </div>
        </section>

        <section class="space-y-2" aria-label="Source health">
          <div class="flex items-center justify-between gap-3 px-0.5">
            <h2 class="text-sm font-bold tracking-tight">Source health</h2>
            <button
              type="button"
              class="px-2.5 py-1.5 rounded-lg bg-base-200/60 border border-base-content/8 text-xs font-medium disabled:opacity-50"
              (click)="reload()"
              [disabled]="sources.isLoading()"
            >
              Refresh
            </button>
          </div>

          @if (sources.isLoading() && !sources.value()) {
            <div class="premium-card py-6 flex justify-center">
              <fa-icon
                [icon]="faCircleNotch"
                class="text-lg text-primary animate-spin"
              />
            </div>
          } @else if (sources.error()) {
            <div class="premium-card px-3 py-4 text-center space-y-1">
              <fa-icon
                [icon]="faTriangleExclamation"
                class="text-error text-base"
              />
              <p class="text-base-content/70 text-xs">
                Could not load source health.
              </p>
            </div>
          } @else {
            <ul class="space-y-1.5">
              @for (s of sources.value()?.sources ?? []; track s.name) {
                <li
                  class="premium-card px-3 py-2.5 flex items-center justify-between gap-3"
                >
                  <div class="min-w-0">
                    <p class="text-sm font-semibold truncate">{{ s.name }}</p>
                    <p class="text-[11px] text-base-content/40 truncate">
                      {{ s.host }} · {{ s.ms }}ms
                    </p>
                  </div>
                  @if (s.ok) {
                    <span
                      class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/15 text-success text-[10px] font-bold uppercase tracking-wide"
                    >
                      <fa-icon [icon]="faCheckCircle" class="text-[10px]" />
                      Up
                    </span>
                  } @else {
                    <span
                      class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-error/15 text-error text-[10px] font-bold uppercase tracking-wide"
                    >
                      <fa-icon
                        [icon]="faTriangleExclamation"
                        class="text-[10px]"
                      />
                      Down
                    </span>
                  }
                </li>
              }
            </ul>
            @if (checkedAt()) {
              <p class="text-center text-[10px] text-base-content/30">
                Checked {{ checkedAt() }}
              </p>
            }
          }
        </section>

        <section class="premium-card p-3.5 space-y-1.5" aria-label="Privacy">
          <h2 class="text-sm font-bold tracking-tight">Account note</h2>
          <p class="text-[11px] text-base-content/45 leading-relaxed">
            Username is your only sign-in. Anyone who knows it can load that
            vault. Prefer a unique username; sign out on shared devices.
          </p>
        </section>

        @if (isLoggedIn()) {
          <button
            type="button"
            class="w-full h-10 rounded-xl border border-error/25 text-error font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
            (click)="signOut()"
          >
            <fa-icon [icon]="faRightFromBracket" class="text-[11px]" />
            <span>Sign out{{ username() ? " · " + username() : "" }}</span>
          </button>
        }
      </div>
    </app-page-content>
  `,
})
export class SettingsPageComponent {
  private http = inject(HttpClient);
  private userService = inject(UserService);
  private playerService = inject(PlayerService);
  private settingsService = inject(SettingsService);
  private storage = inject(StorageService);
  private explore = inject(ExploreService);
  private toast = inject(ToastService);
  private haptics = inject(HapticsService);
  private router = inject(Router);
  exploreRefreshing = this.explore.loading;
  faCircleNotch = faCircleNotch;
  faCheckCircle = faCheckCircle;
  faTriangleExclamation = faTriangleExclamation;
  faRightFromBracket = faRightFromBracket;
  checkedAt = signal("");
  isLoggedIn = computed(() => !!this.userService.user());
  username = computed(() => this.userService.user()?.username || "");
  suggestRegion = this.settingsService.suggestRegion;
  showPlayerDownload = this.settingsService.showPlayerDownload;
  hapticsEnabled = this.settingsService.hapticsEnabled;
  recentCount = computed(() => this.storage.recentSongs().length);
  readonly hasVibrateApi = this.haptics.hasVibrateApi;
  readonly isAppleTouch = this.haptics.isAppleTouch;
  hapticIntensity = signal(0.7);
  readonly hapticPresets: { id: HapticPreset; label: string }[] = [
    { id: "selection", label: "Select" },
    { id: "light", label: "Light" },
    { id: "soft", label: "Soft" },
    { id: "medium", label: "Medium" },
    { id: "heavy", label: "Heavy" },
    { id: "success", label: "Success" },
    { id: "warning", label: "Warn" },
    { id: "error", label: "Error" },
    { id: "buzz", label: "Buzz" },
  ];

  sources = resource({
    loader: async () => {
      const data = await firstValueFrom(
        this.http.get<SourcesResponse>(`${environment.API_URL}/health/sources`),
      );
      this.checkedAt.set(new Date().toLocaleTimeString());
      return data;
    },
  });

  setSuggestRegion(region: SuggestRegion) {
    this.settingsService.setSuggestRegion(region);
  }

  toggleShowPlayerDownload() {
    this.settingsService.toggleShowPlayerDownload();
  }

  toggleHaptics() {
    this.settingsService.toggleHapticsEnabled();
  }

  clearHistory() {
    this.storage.clearRecents();
  }

  async refreshExplore() {
    if (this.explore.loading()) return;
    await this.explore.refresh();
    this.toast.show(
      this.explore.error() ? "Explore refresh failed" : "Explore refreshed",
    );
  }

  onHapticIntensity(event: Event) {
    const v = +(event.target as HTMLInputElement).value;
    if (Number.isFinite(v)) this.hapticIntensity.set(v);
  }

  testHaptic(preset: HapticPreset) {
    this.haptics.test(preset, this.hapticIntensity());
  }

  reload() {
    this.sources.reload();
  }

  signOut() {
    this.playerService.reset();
    this.userService.resetUser();
    void this.router.navigateByUrl("/library");
  }
}
