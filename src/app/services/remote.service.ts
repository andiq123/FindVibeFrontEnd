import { Injectable, signal } from '@angular/core';
import { Song } from '../songs/models/song.model';
import { PlayerService } from './player.service';
import { Session } from '../models/session.model';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class RemoteService {
  baseUrl = environment.API_URL;
  ws?: WebSocket;
  username = signal<string>('');
  sessions = signal<Session[]>([]);
  private isConnected = signal<boolean>(false);

  constructor(private playerService: PlayerService) { }

  async connectToServer(username: string) {
    this.username.set(username);

    this.ws = new WebSocket(
      `${this.baseUrl.replace(/^http(s?):/, 'ws$1:')}/player`
    );

    this.ws.onopen = () => {
      this.isConnected.set(true);
      this.send('Connect', username);
      console.log('Connected to server');
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.method) {
        case 'OtherSessionConnected':
        case 'OtherSessionDisconnected':
          this.sessions.set(msg.data);
          break;

        case 'Play':
          this.playerService.play();
          break;

        case 'Pause':
          this.playerService.pause();
          break;

        case 'SetSong':
          this.playerService.setSong(msg.data);
          break;

        case 'UpdateTime': {
          const serverTime = msg.data.time;
          const latency = msg.latency || 0;
          const estimatedTime = serverTime + latency;

          this.playerService.setCurrentTime(estimatedTime);
          break;
        }
      }
    };

    this.ws.onclose = () => {
      this.isConnected.set(false);
    };
  }

  async disconnectFromServer() {
    if (this.isConnected()) {
      this.send('Disconnect', this.username());
      this.ws?.close();
    }
  }

  async setSong(song: Song) {
    if (this.isConnected()) {
      this.send('SetSong', song);
    }
  }

  async play() {
    if (this.isConnected()) {
      this.send('Play', this.username());
    }
  }

  async pause() {
    if (this.isConnected()) {
      this.send('Pause', this.username());
    }
  }

  async updateTime(time: number) {
    if (this.isConnected()) {
      this.send('UpdateTime', { clientTime: Date.now(), time });
    }
  }

  private send(method: string, data: any) {
    this.ws?.send(JSON.stringify({
      method,
      data,
      timestamp: Date.now()
    }));
  }

  // Cleanup on service destruction
  ngOnDestroy() {
    if (this.ws) {
      this.ws.close();
    }
  }
}