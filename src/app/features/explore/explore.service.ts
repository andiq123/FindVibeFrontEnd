import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { Song } from "../../core/models/song.model";
import { environment } from "../../../environments/environment";

export type ExploreSection = {
  id: string;
  title: string;
  subtitle: string;
  songs: Song[];
};

export type ExploreResponse = {
  country: string;
  sections: ExploreSection[];
  cached?: boolean;
};

@Injectable({ providedIn: "root" })
export class ExploreService {
  private readonly http = inject(HttpClient);

  readonly sections = signal<ExploreSection[]>([]);
  readonly country = signal("Romania");
  readonly loading = signal(false);
  readonly error = signal("");
  private loaded = false;

  /** Reuse in-memory shelves across navigations; server also caches 6h. */
  async load(refresh = false): Promise<void> {
    if (this.loading()) return;
    if (!refresh && this.loaded && this.sections().length) {
      // ponytail: old sessions may hold pre-cover shelves — one silent refresh
      if (!artSparse(this.sections())) return;
      refresh = true;
    }

    this.loading.set(true);
    this.error.set("");
    try {
      const r = await firstValueFrom(
        this.http.get<ExploreResponse>(`${environment.API_URL}/explore`, {
          params: refresh ? { refresh: "1" } : {},
        }),
      );
      this.sections.set(r?.sections ?? []);
      this.country.set(r?.country || "Romania");
      this.loaded = true;
    } catch {
      if (!this.sections().length) {
        this.error.set("Couldn't load charts");
      }
    } finally {
      this.loading.set(false);
    }
  }

  refresh(): Promise<void> {
    return this.load(true);
  }
}

function artSparse(sections: ExploreSection[]): boolean {
  let total = 0;
  let missing = 0;
  for (const s of sections) {
    for (const song of s.songs) {
      total++;
      if (!song.image?.trim()) missing++;
    }
  }
  return total > 0 && missing * 2 >= total;
}
