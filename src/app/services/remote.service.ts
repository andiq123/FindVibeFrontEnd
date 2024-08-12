import { Injectable, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from '@microsoft/signalr';
import { environment } from '../../environments/environment.development';
import { Song } from '../songs/models/song.model';
import { PlayerService } from './player.service';

@Injectable({
  providedIn: 'root',
})
export class RemoteService {
  baseUrl = environment.API_URL;
  connection?: HubConnection;
  username = signal<string>('');
  otherSessions = signal<string[]>([]);
  isConnected = signal<boolean>(false);

  constructor(private playerService: PlayerService) {}

  async connectToServer(username: string) {
    this.username.set(username);

    this.connection = new HubConnectionBuilder()
      .withUrl(this.baseUrl + '/player')
      .configureLogging(LogLevel.Information)
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
    console.log(this.connection.state);
    await this.connection.start();
    await this.connection.invoke('Connect', this.username());
    this.isConnected.set(this.connection.state === 'Connected');
    console.log(this.connection.state);
  }

  async disconnectFromServer() {
    await this.connection?.invoke('Disconnect', this.username());
    await this.connection?.stop();
  }

  async setSong(song: Song) {
    await this.connection?.invoke('SetSong', song, this.username());
  }

  async play() {
    await this.connection?.invoke('Play', this.username());
  }

  async pause() {
    await this.connection?.invoke('Pause', this.username());
  }

  async updateTime(time: string) {
    await this.connection?.invoke('UpdateTime', time, this.username());
  }

  private registerEvents() {
    this.connection?.on('Play', () => {
      this.playerService.play();
    });

    this.connection?.on('Pause', () => {
      this.playerService.pause();
    });

    this.connection?.on('SetSong', (song: Song) => {
      this.playerService.setSong(song);
    });

    this.connection?.on('UpdateTime', (time: string) => {
      this.playerService.setCurrentTime(+time);
    });
  }
}
