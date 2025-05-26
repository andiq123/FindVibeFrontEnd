import { Injectable, signal, OnDestroy } from '@angular/core';
import { Song } from '../songs/models/song.model';
import { PlayerService } from './player.service';
import { Session } from '../models/session.model';
import { environment } from '../../environments/environment.development';

interface ConnectionInfo {
  deviceId: string;
  sessionId: string;
}

interface PingMeasurement {
  timestamp: number;
  rtt: number;
  serverTime: number;
  clientTime: number;
}

interface PlatformAudioDelays {
  ios: number;
  android: number;
  web: number;
  default: number;
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
  private maxReconnectAttempts = 10;
  private reconnectInterval = 1000;
  private pingInterval?: number;
  private reconnectTimeout?: number;
  private connectionConfirmed = false;
  private heartbeatInterval?: number;
  private lastHeartbeatResponse = 0;
  private readonly HEARTBEAT_TIMEOUT = 15000;
  private readonly MAX_LATENCY = 1000;

  private pingHistory: PingMeasurement[] = [];
  private maxPingHistory = 20;
  private currentLatency = 0;
  private timeOffset = 0;
  private isCalibrating = false;
  private calibrationPings = 0;
  private maxCalibrationPings = 10;
  private calibrationTimeout?: number;

  private readonly audioDelays: PlatformAudioDelays = {
    ios: 150,
    android: 50,
    web: 30,
    default: 50
  };

  private readonly platform = this.detectPlatform();

  constructor(private playerService: PlayerService) {
    this.startHeartbeatCheck();
  }

  private startHeartbeatCheck(): void {
    setInterval(() => {
      const now = Date.now();
      if (this.lastHeartbeatResponse > 0 && now - this.lastHeartbeatResponse > this.HEARTBEAT_TIMEOUT) {
        this.handleConnectionLoss();
      }
    }, 5000);
  }

  private handleConnectionLoss(): void {
    if (this.isConnected()) {
      this.reconnectAttempts = 0;
      this.cleanup();
      this.establishConnection().catch(() => {});
    }
  }

  private detectPlatform(): keyof PlatformAudioDelays {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    } else if (/android/.test(userAgent)) {
      return 'android';
    } else {
      return 'web';
    }
  }

  private getAudioDelay(): number {
    return this.audioDelays[this.platform] || this.audioDelays.default;
  }

  async connectToServer(username: string): Promise<void> {
    this.username.set(username);
    this.reconnectAttempts = 0;
    this.connectionConfirmed = false;
    this.resetLatencyMeasurements();
    return this.establishConnection();
  }

  private resetLatencyMeasurements(): void {
    this.pingHistory = [];
    this.currentLatency = 0;
    this.timeOffset = 0;
    this.isCalibrating = false;
    this.calibrationPings = 0;
    this.lastHeartbeatResponse = 0;
  }

  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.cleanup();

        const wsUrl = `${this.baseUrl.replace(/^http(s?):/, 'ws$1:')}/player`;
        this.ws = new WebSocket(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (!this.connectionConfirmed) {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          this.isConnected.set(true);
          this.send('Connect', this.username());
          this.startHeartbeat();
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            this.handleMessage(msg);

            if (msg.method === 'Connected' && !this.connectionConfirmed) {
              this.connectionConfirmed = true;
              clearTimeout(connectionTimeout);
              this.reconnectAttempts = 0;
              this.startPingInterval();
              this.startLatencyCalibration();
              resolve();
            } else if (msg.method === 'Pong') {
              this.lastHeartbeatResponse = Date.now();
            }
          } catch (error) {
            // Error handling
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          this.isConnected.set(false);
          this.connectionConfirmed = false;
          this.stopPingInterval();
          this.stopHeartbeat();
          
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else if (!this.connectionConfirmed) {
            reject(new Error('Failed to establish connection'));
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          if (!this.connectionConfirmed) {
            reject(error);
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      if (this.isConnected() && this.ws?.readyState === WebSocket.OPEN) {
        this.send('Ping', { timestamp: Date.now() });
      }
    }, 5000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private startLatencyCalibration(): void {
    this.isCalibrating = true;
    this.calibrationPings = 0;
    this.sendCalibrationPing();

    this.calibrationTimeout = window.setTimeout(() => {
      if (this.isCalibrating) {
        this.isCalibrating = false;
        this.calibrationPings = this.maxCalibrationPings;
      }
    }, 10000);
  }

  private sendCalibrationPing(): void {
    if (this.calibrationPings < this.maxCalibrationPings) {
      const pingTime = this.getHighResolutionTime();
      this.send('LatencyPing', {
        clientTime: pingTime,
        calibration: true
      });
      this.calibrationPings++;
      
      setTimeout(() => this.sendCalibrationPing(), 500);
    } else {
      this.isCalibrating = false;
      if (this.calibrationTimeout) {
        clearTimeout(this.calibrationTimeout);
      }
    }
  }

  private calculateLatency(clientSendTime: number, serverTime: number, clientReceiveTime: number): void {
    const rtt = clientReceiveTime - clientSendTime;
    
    if (rtt > this.MAX_LATENCY) {
      return;
    }

    const estimatedLatency = rtt / 2;
    const serverClientOffset = serverTime - (clientSendTime + estimatedLatency);

    this.pingHistory.push({
      timestamp: Date.now(),
      rtt,
      serverTime,
      clientTime: clientSendTime
    });

    if (this.pingHistory.length > this.maxPingHistory) {
      this.pingHistory.shift();
    }

    const recentPings = this.pingHistory.slice(-5);
    const weights = recentPings.map((_, index) => index + 1);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    this.currentLatency = recentPings.reduce((sum, ping, index) => 
      sum + (ping.rtt * weights[index]), 0) / totalWeight / 2;

    const offsets = this.pingHistory.map(ping => 
      ping.serverTime - (ping.clientTime + ping.rtt / 2)
    ).sort((a, b) => a - b);
    
    this.timeOffset = offsets[Math.floor(offsets.length / 2)];
  }

  private getHighResolutionTime(): number {
    return performance.now() + performance.timeOrigin;
  }

  private getSynchronizedTime(): number {
    return this.getHighResolutionTime() + this.timeOffset;
  }

  private handleMessage(msg: any): void {
    const receiveTime = this.getHighResolutionTime();

    switch (msg.method) {
      case 'Connected':
        this.connectionInfo.set({
          deviceId: msg.data.deviceId,
          sessionId: msg.data.sessionId
        });
        break;

      case 'LatencyPong':
        if (msg.data && msg.data.clientTime && msg.data.serverTime) {
          this.calculateLatency(msg.data.clientTime, msg.data.serverTime, receiveTime);
        }
        break;

      case 'OtherSessionConnected':
        this.sessions.set(msg.data || []);
        break;

      case 'Ping':
        this.send('Pong', {
          serverTime: msg.timestamp,
          clientTime: this.getHighResolutionTime()
        });
        break;

      case 'Play':
        const audioDelay = this.getAudioDelay();
        if (audioDelay > 0) {
          setTimeout(() => {
            this.playerService.play();
          }, audioDelay);
        } else {
          this.playerService.play();
        }
        break;

      case 'Pause':
        this.playerService.pause();
        break;

      case 'SetSong':
        this.playerService.setSong(msg.data);
        break;

      case 'UpdateTime': {
        let sourceTime: number;
        let eventTimestamp: number = msg.timestamp;

        if (typeof msg.data === 'object' && msg.data.time !== undefined) {
          sourceTime = msg.data.time;
          if (msg.data.timestamp) {
            eventTimestamp = msg.data.timestamp;
          }
        } else if (typeof msg.data === 'number') {
          sourceTime = msg.data;
        } else {
          return;
        }

        const now = this.getSynchronizedTime();
        const networkLatency = this.currentLatency / 1000;
        const audioDelay = this.getAudioDelay() / 1000;
        const timeSinceEvent = (now - eventTimestamp) / 1000;
        
        const compensatedTime = sourceTime + networkLatency + audioDelay + timeSinceEvent;
        const finalTime = Math.max(0, compensatedTime);
        
        this.playerService.setCurrentTime(finalTime);
        break;
      }
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    this.reconnectTimeout = window.setTimeout(() => {
      if (this.username()) {
        this.establishConnection().catch(() => {});
      }
    }, delay);
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = window.setInterval(() => {
      if (this.isConnected() && this.ws?.readyState === WebSocket.OPEN) {
        const pingTime = this.getHighResolutionTime();
        this.send('LatencyPing', {
          clientTime: pingTime,
          calibration: false
        });
      }
    }, 5000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }

  private cleanup(): void {
    this.stopPingInterval();
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
    if (this.calibrationTimeout) {
      clearTimeout(this.calibrationTimeout);
      this.calibrationTimeout = undefined;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  async disconnectFromServer(): Promise<void> {
    if (this.isConnected()) {
      this.send('Disconnect', this.username());
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.cleanup();
    this.isConnected.set(false);
    this.connectionConfirmed = false;
    this.connectionInfo.set(null);
    this.sessions.set([]);
    this.username.set('');
    this.resetLatencyMeasurements();
  }

  async setSong(song: Song): Promise<void> {
    if (this.isConnected() && this.connectionConfirmed) {
      this.send('SetSong', song);
    }
  }

  async play(): Promise<void> {
    if (this.isConnected() && this.connectionConfirmed) {
      this.send('Play', this.username());
    }
  }

  async pause(): Promise<void> {
    if (this.isConnected() && this.connectionConfirmed) {
      this.send('Pause', this.username());
    }
  }

  async updateTime(time: number): Promise<void> {
    if (this.isConnected() && this.connectionConfirmed) {
      this.send('UpdateTime', { 
        time,
        timestamp: this.getSynchronizedTime(),
        platform: this.platform,
        audioDelay: this.getAudioDelay()
      });
    }
  }

  private send(method: string, data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        method,
        data,
        timestamp: this.getSynchronizedTime()
      };
      
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        // Error handling
      }
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}