import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { Song } from "../../core/models/song.model";
import { environment } from "../../../environments/environment";
import { LibraryService } from "../library/services/library.service";
import { StorageService } from "../../core/services/storage.service";
import { rankByListen, rotateIndex } from "../../core/utils/listen-rank";

/** Client-only shelf ids — never passed back into Fiber chart merge. */
const LOCAL_SHELF = new Set(["vault", "recents", "because"]);
const BECAUSE_KEY = "exploreBecause";
const CHARTS_KEY = "exploreCharts";
/** Match Fiber exploreTTL / recommendTTL. */
const CHARTS_TTL_MS = 6 * 60 * 60 * 1000;
/** ponytail: /recommend is the expensive personalization hit — once/day per seed. */
const BECAUSE_TTL_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

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

type ChartsCache = {
  at: number;
  country: string;
  sections: ExploreSection[];
};

@Injectable({ providedIn: "root" })
export class ExploreService {
  private readonly http = inject(HttpClient);
  private readonly library = inject(LibraryService);
  private readonly storage = inject(StorageService);

  readonly sections = signal<ExploreSection[]>([]);
  readonly country = signal("Romania");
  readonly loading = signal(false);
  readonly error = signal("");
  private loaded = false;
  /** Last chart payload from API (no local shelves). */
  private charts: ExploreSection[] = [];
  /** Personalized /recommend shelf — memory + localStorage 24h. */
  private because: ExploreSection | null = null;
  private becauseSeed: string | null = null;
  private becauseFetchKey: string | null = null;
  private becauseFetchGen = 0;
  /** Manual refresh bumps seed rotation within the same day. */
  private seedBump = 0;

  /**
   * Paint from disk instantly, then revalidate /explore in the background.
   * Vault / recents are always local; because uses its own 24h cache.
   */
  async load(refresh = false): Promise<void> {
    if (this.loading()) return;

    // Warm in-memory session — skip network.
    if (!refresh && this.loaded && this.charts.length) {
      this.hydrateBecauseFromCache();
      this.sections.set(this.merge(this.charts));
      return;
    }

    // Cold start: show localStorage shelves immediately, then revalidate.
    if (!refresh) this.paintFromDisk();

    const painted = this.sections().length > 0;
    if (!painted) this.loading.set(true);
    this.error.set("");
    try {
      const r = await firstValueFrom(
        this.http.get<ExploreResponse>(`${environment.API_URL}/explore`, {
          params: refresh ? { refresh: "1" } : {},
        }),
      );
      this.charts = (r?.sections ?? []).filter((s) => !LOCAL_SHELF.has(s.id));
      this.country.set(r?.country || "Romania");
      this.persistCharts();
      this.hydrateBecauseFromCache();
      this.sections.set(this.merge(this.charts));
      this.loaded = true;
      // Force refresh awaits personalization; cold load paints charts first.
      if (refresh) await this.fetchBecauseIfNeeded(true);
      else void this.fetchBecauseIfNeeded(false);
    } catch {
      // Keep disk/memory shelves — only error when nothing to show.
      if (!this.charts.length) this.hydrateChartsFromCache(true);
      this.hydrateBecauseFromCache();
      const local = this.merge(this.charts);
      if (local.length) {
        this.sections.set(local);
        this.loaded = true;
      } else if (!this.sections().length) {
        this.error.set("Couldn't load charts");
      }
    } finally {
      this.loading.set(false);
    }
  }

  /** Manual / pull-to-refresh — bust charts + personalized cache, rotate seed. */
  refresh(): Promise<void> {
    this.storage.removeItem(BECAUSE_KEY);
    this.storage.removeItem(CHARTS_KEY);
    this.because = null;
    this.becauseSeed = null;
    this.becauseFetchKey = null;
    this.becauseFetchGen++;
    this.seedBump++;
    this.charts = [];
    this.loaded = false;
    return this.load(true);
  }

  /** Instant UI from localStorage charts + because + vault/recents. */
  private paintFromDisk(): void {
    // Fresh preferred; stale still paints while network revalidates.
    const hadCharts =
      this.hydrateChartsFromCache(false) || this.hydrateChartsFromCache(true);
    this.hydrateBecauseFromCache();
    if (hadCharts || this.because || this.hasLocalShelves()) {
      this.sections.set(this.merge(this.charts));
    }
  }

  private hasLocalShelves(): boolean {
    return (
      this.library.songs().length >= 3 ||
      this.storage.recentSongs().length >= 3
    );
  }

  private hydrateChartsFromCache(allowStale: boolean): boolean {
    const c = this.storage.getItem<ChartsCache>(CHARTS_KEY);
    if (!c?.sections?.length) return false;
    if (!allowStale && Date.now() - c.at > CHARTS_TTL_MS) return false;
    this.charts = c.sections.filter((s) => !LOCAL_SHELF.has(s.id));
    if (c.country) this.country.set(c.country);
    return this.charts.length > 0;
  }

  private persistCharts(): void {
    if (!this.charts.length) return;
    this.storage.setItem(CHARTS_KEY, {
      at: Date.now(),
      country: this.country(),
      sections: this.charts,
    } satisfies ChartsCache);
  }

  /** Vault + recents + cached because, then Fiber charts. */
  private merge(charts: ExploreSection[]): ExploreSection[] {
    const head: ExploreSection[] = [];
    if (this.because?.songs.length) head.push(this.because);
    const day = Math.floor(Date.now() / DAY_MS);
    const vault = rankByListen(
      this.library.songs(),
      this.storage.listenStats(),
      day,
    ).slice(0, 10);
    if (vault.length >= 3) {
      head.push({
        id: "vault",
        title: "From your vault",
        subtitle: "Favorites",
        songs: vault,
      });
    }
    const recent = takeUnique(this.storage.recentSongs(), 10);
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

  private seedKeyOf(song: Song): string {
    return `${song.artist.trim()}\0${song.title.trim()}`;
  }

  /**
   * Rotate seed daily (and on refresh bump) across vault — not always songs[0].
   * Prefer vault; fall back to recents. Skip last cached seed when alternatives exist.
   */
  private pickSeedSong(): Song | null {
    const day = Math.floor(Date.now() / DAY_MS);
    const vault = this.library.songs();
    const pool = vault.length
      ? rankByListen(vault, this.storage.listenStats(), day)
      : takeUnique(this.storage.recentSongs(), 50);
    if (!pool.length) return null;

    let idx = rotateIndex(pool.length, day, this.seedBump);
    const last = this.storage.getItem<BecauseCache>(BECAUSE_KEY)?.seed;
    let pick = pool[idx];
    if (
      last &&
      pool.length > 1 &&
      pick.artist?.trim() &&
      this.seedKeyOf(pick) === last
    ) {
      idx = rotateIndex(pool.length, day, this.seedBump + 1);
      pick = pool[idx];
    }
    if (!pick?.artist?.trim() || !pick?.title?.trim()) return null;
    return pick;
  }

  private seedKey(): string | null {
    const seed = this.pickSeedSong();
    if (!seed) return null;
    return this.seedKeyOf(seed);
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
    const seed = this.pickSeedSong();
    const key = seed ? this.seedKeyOf(seed) : null;
    if (!seed || !key) return;
    if (!force && this.readBecauseCache(key)) return;
    // Dedupe in-flight for same seed (double pull-to-refresh).
    if (!force && this.becauseFetchKey === key) return;

    const gen = ++this.becauseFetchGen;
    this.becauseFetchKey = key;
    try {
      const songs = await firstValueFrom(
        this.http.get<Song[]>(`${environment.API_URL}/recommend`, {
          params: force
            ? { artist: seed.artist, title: seed.title, refresh: "1" }
            : { artist: seed.artist, title: seed.title },
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

function takeUnique(songs: Song[], n: number): Song[] {
  const out: Song[] = [];
  const seen = new Set<string>();
  for (const s of songs) {
    if (!s.link || seen.has(s.link)) continue;
    seen.add(s.link);
    out.push(s);
    if (out.length >= n) break;
  }
  return out;
}
