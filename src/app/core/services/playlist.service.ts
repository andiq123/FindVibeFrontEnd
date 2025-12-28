import { Injectable, signal, computed } from '@angular/core';
import { Song } from '../models/song.model';
import { shuffleArray } from '../utils/utils';

const TIME_OFFSET_SECONDS = 5;

@Injectable({
  providedIn: 'root',
})
export class PlaylistService {
  private readonly originalList = signal<Song[]>([]);
  private readonly queue = signal<Song[]>([]);
  private readonly currentIndex = signal<number>(-1);

  readonly currentSong = computed(() => {
    const q = this.queue();
    const i = this.currentIndex();
    return (i >= 0 && i < q.length) ? q[i] : null;
  });

  setCurrentSong(song: Song | null): void {
    if (!song) {
      this.currentIndex.set(-1);
      return;
    }

    const index = this.queue().findIndex(s => s.id === song.id);
    this.currentIndex.set(index !== -1 ? index : -1);
  }

  setCurrentPlaylist(songs: Song[]): void {
    this.originalList.set(songs);
    this.queue.set(songs);
    this.currentIndex.set(-1);
  }

  enableShuffle(): void {
    const current = this.currentSong();
    let shuffled = shuffleArray(this.originalList());

    if (current) {
      shuffled = shuffled.filter(s => s.id !== current.id);
      shuffled.unshift(current);
    }

    this.queue.set(shuffled);
    this.currentIndex.set(0);
  }

  disableShuffle(): void {
    const current = this.currentSong();
    this.queue.set(this.originalList());

    if (current) {
      const index = this.originalList().findIndex(s => s.id === current.id);
      this.currentIndex.set(index);
    } else {
      this.currentIndex.set(-1);
    }
  }

  needToReplay(currentTime: number): boolean {
    return currentTime > TIME_OFFSET_SECONDS;
  }

  next(): Song | null {
    const q = this.queue();
    if (q.length === 0) return null;

    const nextIndex = (this.currentIndex() + 1) % q.length;
    this.currentIndex.set(nextIndex);
    return q[nextIndex];
  }

  previous(): Song | null {
    const q = this.queue();
    if (q.length === 0) return null;

    const prevIndex = (this.currentIndex() - 1 + q.length) % q.length;
    this.currentIndex.set(prevIndex);
    return q[prevIndex];
  }

  reset(): void {
    this.originalList.set([]);
    this.queue.set([]);
    this.currentIndex.set(-1);
  }
}
