import { Injectable, signal, computed } from '@angular/core';
import { bytesToGB } from '../../../core/utils/utils';
import { Song } from '../../../core/models/song.model';

/**
 * Cache identifier for consistent access across the service
 */
const CACHE_NAME = 'library-vault';

@Injectable({
  providedIn: 'root',
})
export class OfflineStorageService {
  // State: Storage Metrics
  readonly storageTotal = signal<number>(0);
  readonly storageUsed = signal<number>(0);

  // State: Tracking
  private readonly _currentLoadingDownloadSongIds = signal<string[]>([]);
  private readonly _availableOfflineSongIds = signal<string[]>([]);

  // Read-only exposures
  readonly currentLoadingDownloadSongIds = this._currentLoadingDownloadSongIds.asReadonly();
  readonly availableOfflineSongIds = this._availableOfflineSongIds.asReadonly();
  
  /**
   * Computed state to check if any download is in progress
   */
  readonly isSyncing = computed(() => this._currentLoadingDownloadSongIds().length > 0);

  /**
   * Initializes storage estimates and refreshes usage data
   */
  async setUpStorage(): Promise<void> {
    try {
      if (!navigator.storage?.estimate) return;
      
      const { quota, usage } = await navigator.storage.estimate();
      this.storageTotal.set(bytesToGB(quota ?? 0));
      this.storageUsed.set(bytesToGB(usage ?? 0));
    } catch (error) {
      console.error('[OfflineStorage] Failed to estimate storage:', error);
    }
  }

  /**
   * Caches a batch of songs sequentially to ensure stability
   */
  async cacheAllSongs(songs: Song[]): Promise<void> {
    const cache = await this.getCache();
    
    for (const song of songs) {
      const exists = await this.isAvailableOffline(song.link, cache);
      if (exists) continue;

      this.trackProgress(song.id, true);
      
      try {
        await cache.add(song.link);
        this.addAvailableOfflineSongId(song.id);
        await this.setUpStorage();
      } catch (error) {
        console.warn(`[OfflineStorage] Failed to cache song ${song.title}:`, error);
      } finally {
        this.trackProgress(song.id, false);
      }
    }
  }

  /**
   * Checks if a specific song link is available in the cache. 
   * Returns the Response if found, allowing for data retrieval.
   */
  async isAvailableOffline(songLink: string, existingCache?: Cache): Promise<Response | undefined> {
    const cache = existingCache ?? await this.getCache();
    return await cache.match(songLink);
  }

  /**
   * Wipes the entire library cache and resets state
   */
  async removeCache(): Promise<void> {
    try {
      await caches.delete(CACHE_NAME);
      this.emptyAvailableOfflineSongIds();
      // Brief delay to allow the filesystem to reflect the deletion in usage estimates
      await new Promise(resolve => setTimeout(resolve, 300));
      await this.setUpStorage();
    } catch (error) {
      console.error('[OfflineStorage] Error clearing cache:', error);
    }
  }

  /**
   * Manually adds a song ID to the offline list (used during initial hydration)
   */
  addAvailableOfflineSongId(songId: string): void {
    this._availableOfflineSongIds.update(ids => 
      ids.includes(songId) ? ids : [...ids, songId]
    );
  }

  /**
   * Resets the tracked offline song IDs
   */
  emptyAvailableOfflineSongIds(): void {
    this._availableOfflineSongIds.set([]);
  }

  /**
   * Removes a single song from cache and tracked state
   */
  async removeSongFromCache(songId: string, songLink: string): Promise<void> {
    try {
      const cache = await this.getCache();
      await cache.delete(songLink);
      
      this._availableOfflineSongIds.update(ids => ids.filter(id => id !== songId));
      await this.setUpStorage();
    } catch (error) {
      console.error(`[OfflineStorage] Failed to remove song ${songId}:`, error);
    }
  }

  // --- Private Helpers ---

  private async getCache(): Promise<Cache> {
    return await caches.open(CACHE_NAME);
  }

  private trackProgress(songId: string, isLoading: boolean): void {
    this._currentLoadingDownloadSongIds.update(ids => 
      isLoading ? [...ids, songId] : ids.filter(id => id !== songId)
    );
  }
}
