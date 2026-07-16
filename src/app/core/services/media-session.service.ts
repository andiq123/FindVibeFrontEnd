import { Injectable, inject, effect, OnDestroy, untracked } from "@angular/core";
import { PlaylistService } from "./playlist.service";
import { PlayerService } from "./player.service";
import { PlayerStatus } from "../../features/player/models/player.model";
import { Song } from "../models/song.model";

/** Absolute https/blob URL for lock-screen artwork, or "". */
export function mediaArtworkSrc(image: string): string {
  const raw = image?.trim();
  if (!raw || raw === "no_album_art.jpg") return "";
  try {
    const u = new URL(
      raw,
      typeof location !== "undefined" ? location.href : "https://localhost/",
    );
    if (u.protocol === "http:") u.protocol = "https:";
    if (u.protocol !== "https:" && u.protocol !== "blob:") return "";
    return u.href;
  } catch {
    return "";
  }
}

/**
 * Keep Now Playing alive across Ended→Loading→Playing gaps (iOS PWA).
 * Only true stop / hard error should drop the session to "none".
 */
export function mediaPlaybackState(
  status: PlayerStatus,
): MediaSessionPlaybackState {
  switch (status) {
    case PlayerStatus.Playing:
    case PlayerStatus.Loading:
    case PlayerStatus.Ended:
      return "playing";
    case PlayerStatus.Paused:
      return "paused";
    default:
      return "none";
  }
}

@Injectable({
  providedIn: "root",
})
export class MediaSessionService implements OnDestroy {
  private readonly playlist = inject(PlaylistService);
  private readonly player = inject(PlayerService);
  private lastMetaKey = "";
  private lastStatus: PlayerStatus | null = null;
  private positionTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      if (!("mediaSession" in navigator)) return;
      const song = this.playlist.currentSong();
      const status = this.player.status();
      untracked(() => this.sync(song, status));
    });
  }

  initialize(): void {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const seekBy = (offset: number) => {
      const next = this.player.currentTime() + offset;
      const duration = this.player.duration();
      this.player.seek(
        Math.max(0, duration > 0 ? Math.min(next, duration) : next),
      );
      this.pushPosition();
    };
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => void this.player.play()],
      ["pause", () => this.player.pause()],
      ["stop", () => this.player.pause()],
      ["previoustrack", () => void this.player.setPreviousSong()],
      ["nexttrack", () => void this.player.setNextSong()],
      ["seekbackward", (d) => seekBy(-(d.seekOffset || 10))],
      ["seekforward", (d) => seekBy(d.seekOffset || 10)],
      [
        "seekto",
        (d) => {
          if (d.seekTime != null) {
            this.player.seek(d.seekTime);
            this.pushPosition();
          }
        },
      ],
    ];
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // ponytail: not every action is supported on every OS
      }
    }
  }

  private sync(song: Song | null | undefined, status: PlayerStatus): void {
    const ms = navigator.mediaSession;
    const key = song
      ? `${song.link}\0${song.image}\0${song.title}\0${song.artist}`
      : "";
    if (key !== this.lastMetaKey) {
      this.lastMetaKey = key;
      if (song) {
        const src = mediaArtworkSrc(song.image);
        ms.metadata = new MediaMetadata({
          title: song.title || "Unknown",
          artist: song.artist || "Unknown",
          // omit type — covers are often jpeg/webp, wrong mime drops artwork
          artwork: src
            ? [
                { src, sizes: "512x512" },
                { src, sizes: "256x256" },
              ]
            : [],
        });
      } else {
        ms.metadata = null;
      }
    }

    if (status === this.lastStatus) return;
    this.lastStatus = status;
    ms.playbackState = mediaPlaybackState(status);

    const playing = status === PlayerStatus.Playing;
    const keepAlive =
      playing ||
      status === PlayerStatus.Loading ||
      status === PlayerStatus.Ended;
    this.armPositionTimer(playing);
    if (playing) this.pushPosition();
    else if (!keepAlive) {
      try {
        // empty state clears the scrubber — only when session truly stops
        ms.setPositionState({});
      } catch {
        /* ignore */
      }
    }
  }

  private armPositionTimer(playing: boolean): void {
    if (playing) {
      if (this.positionTimer == null) {
        this.positionTimer = setInterval(() => this.pushPosition(), 1000);
      }
      return;
    }
    if (this.positionTimer != null) {
      clearInterval(this.positionTimer);
      this.positionTimer = null;
    }
  }

  private pushPosition(): void {
    const ms = navigator.mediaSession;
    if (!("setPositionState" in ms)) return;
    const duration = this.player.duration();
    const position = this.player.currentTime();
    // setPositionState throws on NaN / position > duration
    if (!(duration > 0) || !Number.isFinite(duration) || !Number.isFinite(position)) {
      return;
    }
    try {
      ms.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(Math.max(0, position), duration),
      });
    } catch {
      /* ignore */
    }
  }

  ngOnDestroy(): void {
    if (this.positionTimer != null) {
      clearInterval(this.positionTimer);
      this.positionTimer = null;
    }
  }
}
