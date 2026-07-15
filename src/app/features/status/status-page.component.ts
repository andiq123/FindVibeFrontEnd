import {
  ChangeDetectionStrategy,
  Component,
  inject,
  resource,
  signal,
} from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { PageContentComponent } from "../../shared/components/page-content/page-content.component";
import { environment } from "../../../environments/environment";
import {
  faCircleNotch,
  faCheckCircle,
  faTriangleExclamation,
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
  selector: "app-status-page",
  standalone: true,
  imports: [PageContentComponent, FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-content [isServerReady]="true">
      <div class="space-y-6 pb-32 pt-4 max-w-xl mx-auto">
        <div class="flex items-end justify-between gap-4">
          <div>
            <p
              class="text-base-content/45 font-semibold tracking-[0.14em] text-[11px] uppercase mb-1.5"
            >
              System
            </p>
            <h1 class="text-3xl font-bold tracking-tight leading-none">
              Source status
            </h1>
          </div>
          <button
            type="button"
            class="px-3.5 py-2 rounded-xl bg-base-200/60 border border-base-content/8 text-sm font-medium hover:bg-base-200 transition-colors disabled:opacity-50"
            (click)="reload()"
            [disabled]="sources.isLoading()"
          >
            Refresh
          </button>
        </div>

        @if (sources.isLoading() && !sources.value()) {
          <div class="premium-card p-8 flex justify-center">
            <fa-icon
              [icon]="faCircleNotch"
              class="text-2xl text-primary animate-spin"
            />
          </div>
        } @else if (sources.error()) {
          <div class="premium-card p-6 text-center space-y-2">
            <fa-icon
              [icon]="faTriangleExclamation"
              class="text-error text-2xl"
            />
            <p class="text-base-content/70 text-sm">Could not load source health.</p>
          </div>
        } @else {
          <ul class="space-y-3">
            @for (s of sources.value()?.sources ?? []; track s.name) {
              <li
                class="premium-card px-5 py-4 flex items-center justify-between gap-4"
              >
                <div class="min-w-0">
                  <p class="font-semibold truncate">{{ s.name }}</p>
                  <p class="text-xs text-base-content/45 truncate">{{ s.host }}</p>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                  <span class="text-xs text-base-content/40 tabular-nums"
                    >{{ s.ms }}ms</span
                  >
                  @if (s.ok) {
                    <span
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-success/15 text-success text-[11px] font-bold uppercase tracking-wide"
                    >
                      <fa-icon [icon]="faCheckCircle" class="text-xs" />
                      Up
                    </span>
                  } @else {
                    <span
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-error/15 text-error text-[11px] font-bold uppercase tracking-wide"
                    >
                      <fa-icon [icon]="faTriangleExclamation" class="text-xs" />
                      Down
                    </span>
                  }
                </div>
              </li>
            }
          </ul>
          @if (checkedAt()) {
            <p class="text-center text-[11px] text-base-content/35">
              Checked {{ checkedAt() }}
            </p>
          }
        }
      </div>
    </app-page-content>
  `,
})
export class StatusPageComponent {
  private http = inject(HttpClient);
  faCircleNotch = faCircleNotch;
  faCheckCircle = faCheckCircle;
  faTriangleExclamation = faTriangleExclamation;
  checkedAt = signal("");

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
}
