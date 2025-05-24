import { Injectable, signal, OnDestroy } from '@angular/core';
import { Song } from '../songs/models/song.model';
import { PlayerService } from './player.service';
import { Session } from '../models/session.model';
import { environment } from '../../environments/environment.development';

interface ConnectionInfo {
  deviceId: string;
  sessionId: string;
}

@Injectable({
  providedIn: 'root',
})
export class RemoteService implements OnDestroy {
  baseUrl = environment.API_URL;
  ws?: WebSocket;
  username = signal<string>('');
  sessions = signal<Session[]>([]);
  connectionInfo = signal<ConnectionInfo | null>(null);
  private isConnected = signal<boolean>(false);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000; // Start with 1 second
  private pingInterval?: number;
  private reconnectTimeout?: number;
  private connectionConfirmed = false;

  constructor(private playerService: PlayerService) {}

  async connectToServer(username: string): Promise<void> {
    this.username.set(username);
    this.reconnectAttempts = 0;
    this.connectionConfirmed = false;
    return this.establishConnection();
  }

  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Clean up existing connection
        this.cleanup();

        const wsUrl = `${this.baseUrl.replace(/^http(s?):/, 'ws$1:')}/player`;
        
        this.ws = new WebSocket(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (!this.connectionConfirmed) {
            console.error('Connection timeout');
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000); // 10 second timeout

        this.ws.onopen = () => {
          this.isConnected.set(true);
          this.send('Connect', this.username());
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            this.handleMessage(msg);

            // If this is the connection confirmation, resolve the promise
            if (msg.method === 'Connected' && !this.connectionConfirmed) {
              this.connectionConfirmed = true;
              clearTimeout(connectionTimeout);
              this.reconnectAttempts = 0;
              this.startPingInterval();
              resolve();
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          this.isConnected.set(false);
          this.connectionConfirmed = false;
          this.stopPingInterval();
          
          // Only attempt reconnection if it wasn't a manual disconnect
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else if (!this.connectionConfirmed) {
            reject(new Error('Failed to establish connection'));
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          clearTimeout(connectionTimeout);
          if (!this.connectionConfirmed) {
            reject(error);
          }
        };

      } catch (error) {
        console.error('Error establishing connection:', error);
        reject(error);
      }
    });
  }

  private handleMessage(msg: any): void {
    switch (msg.method) {
      case 'Connected':
        console.log('Connection confirmed:', msg.data);
        this.connectionInfo.set({
          deviceId: msg.data.deviceId,
          sessionId: msg.data.sessionId
        });
        break;

      case 'OtherSessionConnected':
        console.log('Other sessions:', msg.data);
        this.sessions.set(msg.data || []);
        break;

      case 'Ping':
        // Respond to server ping
        this.send('Pong', null);
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
        
        // Handle both old and new data formats
        let sourceTime: number;
        if (typeof msg.data === 'object' && msg.data.time !== undefined) {
          sourceTime = msg.data.time;
        } else if (typeof msg.data === 'number') {
          sourceTime = msg.data;
        } else {
          console.warn('Invalid UpdateTime data format:', msg.data);
          return;
        }

        const eventTimestamp = msg.timestamp;
        const now = Date.now();
        const latency = (now - eventTimestamp) / 1000;
        const estimatedTime = Math.max(0, sourceTime + latency); // Ensure non-negative
        
        this.playerService.setCurrentTime(estimatedTime);
        break;
      }

      default:
        console.log('Unknown message method:', msg.method);
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    this.reconnectTimeout = window.setTimeout(() => {
      if (this.username()) {
        this.establishConnection().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    // Send ping every 25 seconds (backend checks every 30 seconds)
    this.pingInterval = window.setInterval(() => {
      if (this.isConnected() && this.ws?.readyState === WebSocket.OPEN) {
        this.send('Pong', null); // Send pong proactively to maintain connection
      }
    }, 25000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }

  private cleanup(): void {
    this.stopPingInterval();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  async disconnectFromServer(): Promise<void> {
    if (this.isConnected()) {
      this.send('Disconnect', this.username());
      
      // Wait a bit for the message to be sent before closing
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.cleanup();
    this.isConnected.set(false);
    this.connectionConfirmed = false;
    this.connectionInfo.set(null);
    this.sessions.set([]);
    this.username.set('');
  }

  async setSong(song: Song): Promise<void> {
    if (this.isConnected() && this.connectionConfirmed) {
      this.send('SetSong', song);
    } else {
      console.warn('Cannot set song: not connected');
    }
  }

  async play(): Promise<void> {
    if (this.isConnected() && this.connectionConfirmed) {
      this.send('Play', this.username());
    } else {
      console.warn('Cannot play: not connected');
    }
  }

  async pause(): Promise<void> {
    if (this.isConnected() && this.connectionConfirmed) {
      this.send('Pause', this.username());
    } else {
      console.warn('Cannot pause: not connected');
    }
  }

  async updateTime(time: number): Promise<void> {
    if (this.isConnected() && this.connectionConfirmed) {
      this.send('UpdateTime', { 
        time,
        timestamp: Date.now()
      });
    } else {
      console.warn('Cannot update time: not connected');
    }
  }

  private send(method: string, data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        method,
        data,
        timestamp: Date.now()
      };
      
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      console.warn('Cannot send message: WebSocket not open', { method, data });
    }
  }

  // Getters for reactive signals
  get isConnectedSignal() {
    return this.isConnected.asReadonly();
  }

  get usernameSignal() {
    return this.username.asReadonly();
  }

  get sessionsSignal() {
    return this.sessions.asReadonly();
  }

  get connectionInfoSignal() {
    return this.connectionInfo.asReadonly();
  }

  // Cleanup on service destruction
  ngOnDestroy(): void {
    console.log('RemoteService destroyed, cleaning up');
    this.cleanup();
  }
}