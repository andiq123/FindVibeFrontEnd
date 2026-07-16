import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { Song } from "../../core/models/song.model";
import { environment } from "../../../environments/environment";
import { HapticsService } from "../../core/services/haptics.service";
import { LibraryService } from "../library/services/library.service";
import { StorageService } from "../../core/services/storage.service";

/** Client-only shelf ids — never passed back into Fiber chart merge. */
const LOCAL_SHELF = new Set(["vault", "recents", "because"]);
const BECAUSE_KEY = "exploreBecause";
/** ponytail: /recommend is the expensive personalization hit — once/day per seed. */
const BECAUSE_TTL_MS = 24 * 60 * 60 * 1000;

export type ExploreSection = {
  id: string;
  title: string;
  subtitle: string;
  /** Already Fiber-resolved search songs (same Song as /search). */
  songs: Song[];
};

export type ExploreResponse = {
  country: string;
  sections: ExploreSection[];
  cached?: boolean;
};

type BecauseCache = {
  seed: string;
  at: number;
  title: string;
  subtitle: string;
  songs: Song[];
};

@Injectable({ providedIn: "root" })
export class ExploreService {
  private readonly http = inject(HttpClient);
  private readonly haptics = inject(HapticsService);
  private readonly library = inject(LibraryService);
  private readonly storage = inject(StorageService);

  readonly sections = signal<ExploreSection[]>([]);
  readonly country = signal("Romania");
  readonly loading = signal(false);
  readonly error = signal("");
  private loaded = false;
  /** One silent sparse-art refresh per session — avoid refresh=1 loops. */
  private triedSparseRefresh = false;
  /** Last chart payload from API (no local shelves). */
  private charts: ExploreSection[] = [];
  /** Personalized /recommend shelf — memory + localStorage 24h. */
  private because: ExploreSection | null = null;
  private becauseSeed: string | null = null;
  private becauseFetchKey: string | null = null;
  private becauseFetchGen = 0;

  /** Reuse in-memory shelves across navigations; server also caches charts 6h. */
  async load(refresh = false): Promise<void> {
    if (this.loading()) return;
    if (!refresh && this.loaded && this.charts.length) {
      // ponytail: old sessions may hold pre-cover shelves — one silent refresh
      if (!artSparse(this.charts) || this.triedSparseRefresh) {
        this.hydrateBecauseFromCache();
        this.sections.set(this.merge(this.charts));
        return;
      }
      this.triedSparseRefresh = true;
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
      this.charts = (r?.sections ?? []).filter((s) => !LOCAL_SHELF.has(s.id));
      this.country.set(r?.country || "Romania");
      this.hydrateBecauseFromCache();
      this.sections.set(this.merge(this.charts));
      this.loaded = true;
      this.haptics.ready();
      // Force refresh awaits personalization; cold load paints charts first.
      if (refresh) await this.fetchBecauseIfNeeded(true);
      else void this.fetchBecauseIfNeeded(false);
    } catch {
      this.charts = [];
      this.hydrateBecauseFromCache();
      const local = this.merge([]);
      if (local.length) {
        this.sections.set(local);
        this.loaded = true;
      } else if (!this.sections().length) {
        this.error.set("Couldn't load charts");
        this.haptics.warnOnce("explore");
      }
    } finally {
      this.loading.set(false);
    }
  }

  /** Manual / pull-to-refresh — bust charts + personalized 24h cache. */
  refresh(): Promise<void> {
    this.storage.removeItem(BECAUSE_KEY);
    this.because = null;
    this.becauseSeed = null;
    this.becauseFetchKey = null;
    this.becauseFetchGen++;
    this.triedSparseRefresh = false;
    return this.load(true);
  }

  /** Vault + recents + cached because, then Fiber charts. */
  private merge(charts: ExploreSection[]): ExploreSection[] {
    const head: ExploreSection[] = [];
    if (this.because?.songs.length) head.push(this.because);
    const vault = takeByLink(this.library.songs(), 10);
    if (vault.length >= 3) {
      head.push({
        id: "vault",
        title: "From your vault",
        subtitle: "Favorites",
        songs: vault,
      });
    }
    const recent = takeByLink(this.storage.recentSongs(), 10);
    if (recent.length >= 3) {
      head.push({
        id: "recents",
        title: "Jump back in",
        subtitle: "Recent listens",
        songs: recent,
      });
    }
    const seen = new Set(head.map((s) => s.id));
    return [...head, ...charts.filter((s) => !seen.has(s.id))];
  }

  private seedKey(): string | null {
    const seed =
      this.library.songs()[0] || this.storage.recentSongs()[0] || null;
    if (!seed?.artist?.trim() || !seed?.title?.trim()) return null;
    return `${seed.artist.trim()}\0${seed.title.trim()}`;
  }

  private seedSong(): Song | null {
    return this.library.songs()[0] || this.storage.recentSongs()[0] || null;
  }

  /** Sync: paint from localStorage when same seed + fresh (<24h). */
  private hydrateBecauseFromCache(): void {
    const key = this.seedKey();
    if (!key) {
      this.because = null;
      this.becauseSeed = null;
      return;
    }
    const hit = this.readBecauseCache(key);
    if (hit) {
      this.because = hit;
      this.becauseSeed = key;
      return;
    }
    if (this.becauseSeed && this.becauseSeed !== key) {
      this.because = null;
      this.becauseSeed = null;
    }
  }

  /** Async: /recommend only on miss or forced refresh. */
  private async fetchBecauseIfNeeded(force: boolean): Promise<void> {
    const seed = this.seedSong();
    const key = this.seedKey();
    if (!seed || !key) return;
    if (!force && this.readBecauseCache(key)) return;
    // Dedupe in-flight for same seed (double pull-to-refresh).
    if (!force && this.becauseFetchKey === key) return;

    const gen = ++this.becauseFetchGen;
    this.becauseFetchKey = key;
    try {
      const songs = await firstValueFrom(
        this.http.get<Song[]>(`${environment.API_URL}/recommend`, {
          params: { artist: seed.artist, title: seed.title },
        }),
      );
      if (gen !== this.becauseFetchGen || this.seedKey() !== key) return;
      if (!songs?.length) return;
      this.because = {
        id: "because",
        title: `Because you liked ${seed.title}`,
        subtitle: seed.artist,
        songs,
      };
      this.becauseSeed = key;
      this.storage.setItem(BECAUSE_KEY, {
        seed: key,
        at: Date.now(),
        title: this.because.title,
        subtitle: this.because.subtitle,
        songs,
      } satisfies BecauseCache);
      this.sections.set(this.merge(this.charts));
    } catch {
      if (gen !== this.becauseFetchGen) return;
      const stale = this.readBecauseCache(key, true);
      if (stale && !this.because) {
        this.because = stale;
        this.becauseSeed = key;
        this.sections.set(this.merge(this.charts));
      }
    } finally {
      if (gen === this.becauseFetchGen) this.becauseFetchKey = null;
    }
  }

  private readBecauseCache(
    seedKey: string,
    allowStale = false,
  ): ExploreSection | null {
    const c = this.storage.getItem<BecauseCache>(BECAUSE_KEY);
    if (!c?.songs?.length || c.seed !== seedKey) return null;
    if (!allowStale && Date.now() - c.at > BECAUSE_TTL_MS) return null;
    return {
      id: "because",
      title: c.title,
      subtitle: c.subtitle,
      songs: c.songs,
    };
  }
}

function takeByLink(songs: Song[], n: number): Song[] {
  if (!songs.length) return [];
  // ponytail: stable by link — no Math.random flicker on revisit
  return [...songs].sort((a, b) => (a.link > b.link ? 1 : -1)).slice(0, n);
}

function artSparse(charts: ExploreSection[]): boolean {
  let total = 0;
  let missing = 0;
  for (const s of charts) {
    for (const song of s.songs) {
      total++;
      if (!song.image?.trim()) missing++;
    }
  }
  return total > 0 && missing * 2 >= total;
}
