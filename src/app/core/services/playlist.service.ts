import { Injectable, signal, computed, inject } from "@angular/core";
import { Song } from "../models/song.model";
import { shuffleArray } from "../utils/utils";
import { SettingsService } from "./settings.service";
@Injectable({
  providedIn: "root",
})
export class PlaylistService {
  private readonly settingsService = inject(SettingsService);
  private readonly originalList = signal<Song[]>([]);
  private readonly queue = signal<Song[]>([]);
  private readonly currentIndex = signal<number>(-1);
  readonly queueLength = computed(() => this.queue().length);
  readonly currentSong = computed(() => {
    const q = this.queue();
    const i = this.currentIndex();
    return i >= 0 && i < q.length ? q[i] : null;
  });
  setCurrentSong(song: Song | null): void {
    if (!song) {
      this.currentIndex.set(-1);
      return;
    }
    const index = this.queue().findIndex((s) => s.id === song.id);
    this.currentIndex.set(index !== -1 ? index : -1);
  }
  setCurrentPlaylist(songs: Song[]): void {
    this.originalList.set(songs);
    if (this.settingsService.isShuffle()) {
      const current = this.currentSong();
      let shuffled = shuffleArray(songs);
      if (current) {
        shuffled = shuffled.filter((s) => s.id !== current.id);
        shuffled.unshift(current);
      }
      this.queue.set(shuffled);
      this.currentIndex.set(0);
    } else {
      this.queue.set(songs);
      const current = this.currentSong();
      if (current) {
        const index = songs.findIndex((s) => s.id === current.id);
        this.currentIndex.set(index !== -1 ? index : -1);
      } else {
        this.currentIndex.set(-1);
      }
    }
  }
  enableShuffle(): void {
    const current = this.currentSong();
    let shuffled = shuffleArray(this.originalList());
    if (current) {
      shuffled = shuffled.filter((s) => s.id !== current.id);
      shuffled.unshift(current);
    }
    this.queue.set(shuffled);
    this.currentIndex.set(0);
  }
  disableShuffle(): void {
    const current = this.currentSong();
    this.queue.set(this.originalList());
    if (current) {
      const index = this.originalList().findIndex((s) => s.id === current.id);
      this.currentIndex.set(index);
    } else {
      this.currentIndex.set(-1);
    }
  }
  next(): Song | null {
    const q = this.queue();
    if (q.length === 0) return null;
    const nextIndex = this.currentIndex() + 1;
    if (nextIndex >= q.length) return null;
    this.currentIndex.set(nextIndex);
    return q[nextIndex];
  }
  previous(): Song | null {
    const q = this.queue();
    if (q.length === 0) return null;
    const prevIndex = this.currentIndex() - 1;
    if (prevIndex < 0) return null;
    this.currentIndex.set(prevIndex);
    return q[prevIndex];
  }
  jumpToIndex(index: number): void {
    if (index >= 0 && index < this.queue().length) {
      this.currentIndex.set(index);
    }
  }
  reset(): void {
    this.originalList.set([]);
    this.queue.set([]);
    this.currentIndex.set(-1);
  }
}
