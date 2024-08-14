import { Injectable, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { environment } from '../../environments/environment.development';
import { Song } from '../songs/models/song.model';
import { PlayerService } from './player.service';
import { delayCustom } from '../utils/utils';

@Injectable({
  providedIn: 'root',
})
export class RemoteService {
  baseUrl = environment.API_URL;
  connection?: HubConnection;
  username = signal<string>('');
  otherSessions = signal<string[]>([]);
  private isConnected = signal<boolean>(false);

  constructor(private playerService: PlayerService) {}

  async connectToServer(username: string) {
    this.username.set(username);

    this.connection = new HubConnectionBuilder()
      .withUrl(this.baseUrl + '/player')
      .build();

    this.connection.on('OtherSessionConnected', (sessionId: string) => {
      this.otherSessions.update((prev) => [...prev, sessionId]);
    });

    this.connection.on('OtherSessionDisconnected', (sessionId: string) => {
      this.otherSessions.update((prev) =>
        prev.filter((id) => id !== sessionId)
      );
    });

    this.registerEvents();

    await this.connection.start();
    await this.connection.invoke('Connect', this.username());
    this.isConnected.set(this.connection.state === 'Connected');
  }

  async disconnectFromServer() {
    await this.connection?.invoke('Disconnect', this.username());
    await this.connection?.stop();
  }

  async setSong(song: Song) {
    if (this.isConnected()) {
      await this.connection?.invoke('SetSong', song, this.username());
    }
  }

  async play() {
    if (this.isConnected()) {
      await this.connection?.invoke('Play', this.username());
    }
  }

  async pause() {
    if (this.isConnected()) {
      await this.connection?.invoke('Pause', this.username());
    }
  }

  startTime?: Date;
  async updateTime(time: string) {
    if (this.isConnected()) {
      if (this.otherSessions().length > 0) {
        this.startTime = new Date();
        this.playerService.pause();
      }

      await this.connection?.invoke('UpdateTime', time, this.username());
    }
  }

  async syncTime() {
    if (this.isConnected()) {
      await this.connection?.invoke('SyncTime', this.username());
    }
  }

  private registerEvents() {
    this.connection?.on('Play', async () => {
      await this.playerService.play();
    });

    this.connection?.on('Pause', () => {
      this.playerService.pause();
    });

    this.connection?.on('SetSong', async (song: Song) => {
      await this.playerService.setSong(song);
    });

    this.connection?.on('UpdateTime', async (time: string) => {
      this.playerService.pause();
      this.playerService.setCurrentTime(+time);

      await this.playerService.play();

      await this.syncTime();
    });

    this.connection?.on('SyncTime', async () => {
      const time = this.playerService.currentTime$();

      if (this.startTime) {
        const diffMs = new Date().getTime() - this.startTime.getTime();
        const diffSeconds = diffMs / 100;
        const newTime = time + diffSeconds;
        this.playerService.setCurrentTime(newTime);
        await this.playerService.play();
      }
    });
  }
}
