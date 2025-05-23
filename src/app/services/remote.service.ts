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
  private latency = signal<number>(0);
  private lastPingTime = 0;
  private pingInterval: any;
  private readonly PING_INTERVAL = 5000; // 5 seconds

  constructor(private playerService: PlayerService) {}

  async connectToServer(username: string) {
    this.username.set(username);

    this.ws = new WebSocket(
      `${this.baseUrl.replace(/^http(s?):/, 'ws$1:')}/player`
    );

    this.ws.onopen = () => {
      this.isConnected.set(true);
      this.send('Connect', username);
      this.startPingPong();
      console.log('Connected to server');
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const serverTime = msg.timestamp;
      const currentTime = Date.now();
      // Calculate time difference between server and client
      const timeDiff = currentTime - serverTime;

      switch (msg.method) {
        case 'Pong':
          // RTT calculation
          const rtt = currentTime - this.lastPingTime;
          this.latency.set(rtt / 2); // one-way latency
          break;

        case 'OtherSessionConnected':
        case 'OtherSessionDisconnected':
          this.sessions.set(msg.data);
          break;

        case 'Play':
          // Calculate when to start playing based on latency
          const playDelay = Math.max(0, this.latency());
          setTimeout(() => {
            this.playerService.play();
          }, playDelay);
          break;

        case 'Pause':
          // Apply pause immediately
          this.playerService.pause();
          break;

        case 'SetSong':
          // Apply the song change immediately
          this.playerService.setSong(msg.data);
          break;

        case 'UpdateTime':
          // Use server time and measured latency for more accurate sync
          const serverTimeValue = +msg.data;
          const estimatedClientTime = serverTimeValue + this.latency();
          this.playerService.setCurrentTime(estimatedClientTime);
          break;
      }
    };

    this.ws.onclose = () => {
      this.isConnected.set(false);
      this.stopPingPong();
    };
  }

  private startPingPong() {
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.lastPingTime = Date.now();
        this.send('Ping', { clientTime: this.lastPingTime });
      }
    }, this.PING_INTERVAL);
  }

  private stopPingPong() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  async disconnectFromServer() {
    if (this.isConnected()) {
      this.send('Disconnect', this.username());
      this.stopPingPong();
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

  async updateTime(time: string) {
    if (this.isConnected()) {
      this.send('UpdateTime', time);
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
    this.stopPingPong();
    if (this.ws) {
      this.ws.close();
    }
  }
}