import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { PageContentComponent } from "../../shared/components/page-content/page-content.component";
import { StorageInfoComponent } from "../library/components/storage-info/storage-info.component";
import { UserService } from "../library/services/user.service";
import { PlaylistService } from "../../core/services/playlist.service";
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
  imports: [PageContentComponent, StorageInfoComponent, FontAwesomeModule],
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
  private playlistService = inject(PlaylistService);
  private router = inject(Router);
  faCircleNotch = faCircleNotch;
  faCheckCircle = faCheckCircle;
  faTriangleExclamation = faTriangleExclamation;
  faRightFromBracket = faRightFromBracket;
  checkedAt = signal("");
  isLoggedIn = computed(() => !!this.userService.user());
  username = computed(() => this.userService.user()?.username || "");

  sources = resource({
    loader: async () => {
      const data = await firstValueFrom(
        this.http.get<SourcesResponse>(`${environment.API_URL}/health/sources`),
      );
      this.checkedAt.set(new Date().toLocaleTimeString());
      return data;
    },
  });

  reload() {
    this.sources.reload();
  }

  signOut() {
    this.playlistService.reset();
    this.userService.resetUser();
    void this.router.navigateByUrl("/library");
  }
}
