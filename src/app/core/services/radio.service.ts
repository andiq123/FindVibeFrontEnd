import {
  Injectable,
  inject,
  signal,
  effect,
  untracked,
} from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { Song } from "../models/song.model";
import { PlaylistService } from "./playlist.service";
import { environment } from "../../../environments/environment";

/** Prefetch when this many tracks remain after now-playing. */
const EXTEND_WHEN_LEFT = 2;

@Injectable({ providedIn: "root" })
export class RadioService {
  private readonly http = inject(HttpClient);
  private readonly playlist = inject(PlaylistService);
  private extending = false;
  private lastExtendLink = "";

  readonly loading = signal(false);
  readonly error = signal("");

  clearError(): void {
    this.error.set("");
  }

  constructor() {
    // ponytail: infinite radio — prefetch from current seed before the queue runs dry.
    effect(() => {
      if (!this.playlist.radioActive()) return;
      const left = this.playlist.remaining();
      const seed = this.playlist.currentSong();
      if (left > EXTEND_WHEN_LEFT || !seed?.link) return;
      untracked(() => void this.extend(seed));
    });
  }

  /** Replace playlist with seed + recommendations; arms radio mode. */
  async start(seed: Song): Promise<boolean> {
    if (this.loading()) return false;
    if (!seed.artist?.trim() || !seed.title?.trim()) {
      this.error.set("Missing artist or title");
      return false;
    }
    this.loading.set(true);
    this.error.set("");
    this.lastExtendLink = "";
    try {
      const next = await this.fetchUnique(seed, new Set([seed.link]));
      if (!next.length) {
        this.error.set("No radio tracks found");
        return false;
      }
      this.playlist.setRadioPlaylist([seed, ...next]);
      this.playlist.setCurrentSong(seed);
      return true;
    } catch (e: unknown) {
      this.error.set(apiError(e));
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  private async extend(seed: Song): Promise<void> {
    if (!this.playlist.radioActive() || this.extending) return;
    if (seed.link === this.lastExtendLink) return;
    this.extending = true;
    this.lastExtendLink = seed.link;
    try {
      const seen = new Set(
        this.playlist.queueLinks().filter(Boolean) as string[],
      );
      const next = await this.fetchUnique(seed, seen);
      if (next.length) this.playlist.appendSongs(next);
    } catch {
      this.lastExtendLink = "";
    } finally {
      this.extending = false;
    }
  }

  private async fetchUnique(seed: Song, seenLinks: Set<string>): Promise<Song[]> {
    const songs = await firstValueFrom(
      this.http.get<Song[]>(`${environment.API_URL}/recommend`, {
        params: { artist: seed.artist, title: seed.title },
      }),
    );
    const keys = new Set<string>(
      [songKey(seed), ...this.playlist.queueSongs().map(songKey)].filter(Boolean),
    );
    const out: Song[] = [];
    for (const s of songs ?? []) {
      if (!s.link || seenLinks.has(s.link)) continue;
      const k = songKey(s);
      if (!k || keys.has(k)) continue;
      seenLinks.add(s.link);
      keys.add(k);
      out.push(s);
    }
    return out;
  }
}

/** Collapse remix/feat noise — matches Fiber coreTitle. */
function songKey(s: Pick<Song, "artist" | "title">): string {
  const artist = (s.artist || "").toLowerCase().trim();
  let title = (s.title || "").toLowerCase().trim();
  title = title
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/\s*(feat\.?|ft\.?|featuring)\s+.*/g, " ")
    .replace(
      /\b(original\s+mix|extended\s+mix|radio\s+edit|club\s+mix|remix|bootleg|edit|mix|version|remaster(ed)?|instrumental|karaoke|live|acoustic|dub)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  return artist && title ? `${artist}|${title}` : "";
}

function apiError(e: unknown): string {
  const err = e as { error?: { error?: string }; message?: string; status?: number };
  if (err?.status === 0) return "Can't reach the server";
  return err?.error?.error || "Couldn't start radio — try another track";
}
