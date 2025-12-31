import { Signal } from '@angular/core';
import { PlaylistService } from '../services/playlist.service';
import { Song } from '../models/song.model';

export function updatePlaylist(
  playlistService: PlaylistService,
  songs: Signal<Song[]>
): void {
  playlistService.setCurrentPlaylist(songs());
}
