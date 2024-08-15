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
  isAndroid = signal<boolean>(false);
  isIOS = signal<boolean>(false);
  isWindows = signal<boolean>(false);
  private isConnected = signal<boolean>(false);

  constructor(private playerService: PlayerService) {
    this.isAndroid.set(/Android/i.test(navigator.userAgent));
    this.isIOS.set(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    this.isWindows.set(/Windows/i.test(navigator.userAgent));
  }

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

  async updateTime(time: string) {
    if (this.isConnected()) {
      const startTime = Date.now();
      await this.connection?.invoke(
        'UpdateTime',
        time,
        startTime,
        this.username()
      );
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

    this.connection?.on('UpdateTime', (time: string, startTimeInMS: number) => {
      const diffMS = Date.now() - startTimeInMS;
      let difference = diffMS / 1000;
      if (this.isAndroid()) {
        difference -= 0.1;
      }
      this.playerService.setCurrentTime(+time + difference);
    });
  }
}
