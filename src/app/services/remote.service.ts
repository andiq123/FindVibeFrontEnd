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
  rtt: number; // Round-trip time in milliseconds
}

interface PlatformAudioDelays {
  ios: number;
  android: number;
  web: number;
  default: number;
}

interface TimeSync {
  serverTime: number;
  clientTime: number;
  offset: number;
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
  private reconnectInterval = 1000;
  private pingInterval?: number;
  private reconnectTimeout?: number;
  private connectionConfirmed = false;

  // Latency and sync management
  private pingHistory: PingMeasurement[] = [];
  private maxPingHistory = 10;
  private currentLatency = 0;
  private timeOffset = 0; // Difference between server and client time
  private isCalibrating = false;
  private calibrationPings = 0;
  private maxCalibrationPings = 5;

  // Platform-specific audio delays (in milliseconds)
  private readonly audioDelays: PlatformAudioDelays = {
    ios: 150,      // iOS has higher audio latency
    android: 50,   // Android is generally faster
    web: 30,       // Web audio is usually quick
    default: 50    // Default fallback
  };

  private readonly platform = this.detectPlatform();

  constructor(private playerService: PlayerService) {}

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
  }

  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.cleanup();

        const wsUrl = `${this.baseUrl.replace(/^http(s?):/, 'ws$1:')}/player`;
        console.log('Connecting to WebSocket:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (!this.connectionConfirmed) {
            console.error('Connection timeout');
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          console.log('WebSocket opened, sending connect message');
          this.isConnected.set(true);
          this.send('Connect', this.username());
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            console.log('Received message:', msg);
            this.handleMessage(msg);

            if (msg.method === 'Connected' && !this.connectionConfirmed) {
              this.connectionConfirmed = true;
              clearTimeout(connectionTimeout);
              this.reconnectAttempts = 0;
              this.startPingInterval();
              this.startLatencyCalibration();
              resolve();
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event);
          clearTimeout(connectionTimeout);
          this.isConnected.set(false);
          this.connectionConfirmed = false;
          this.stopPingInterval();
          
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

  private startLatencyCalibration(): void {
    this.isCalibrating = true;
    this.calibrationPings = 0;
    console.log('Starting latency calibration...');
    
    // Send initial calibration pings
    this.sendCalibrationPing();
  }

  private sendCalibrationPing(): void {
    if (this.calibrationPings < this.maxCalibrationPings) {
      const pingTime = this.getHighResolutionTime();
      this.send('LatencyPing', {
        clientTime: pingTime,
        calibration: true
      });
      this.calibrationPings++;
      
      // Schedule next ping
      setTimeout(() => this.sendCalibrationPing(), 500);
    } else {
      this.isCalibrating = false;
      console.log('Latency calibration completed');
      console.log(`Average latency: ${this.currentLatency}ms`);
      console.log(`Time offset: ${this.timeOffset}ms`);
      console.log(`Platform: ${this.platform}, Audio delay: ${this.getAudioDelay()}ms`);
    }
  }

  private getHighResolutionTime(): number {
    return performance.now() + performance.timeOrigin;
  }

  private calculateLatency(clientSendTime: number, serverTime: number, clientReceiveTime: number): void {
    const rtt = clientReceiveTime - clientSendTime;
    const estimatedLatency = rtt / 2;
    const serverClientOffset = serverTime - (clientSendTime + estimatedLatency);

    // Add to ping history
    this.pingHistory.push({
      timestamp: Date.now(),
      rtt: rtt
    });

    // Keep only recent measurements
    if (this.pingHistory.length > this.maxPingHistory) {
      this.pingHistory.shift();
    }

    // Calculate average latency from recent measurements
    const recentPings = this.pingHistory.slice(-5); // Use last 5 measurements
    this.currentLatency = recentPings.reduce((sum, ping) => sum + ping.rtt, 0) / recentPings.length / 2;
    
    // Update time offset (for clock synchronization)
    this.timeOffset = serverClientOffset;

    console.log(`Latency update - RTT: ${rtt.toFixed(2)}ms, Avg Latency: ${this.currentLatency.toFixed(2)}ms, Offset: ${this.timeOffset.toFixed(2)}ms`);
  }

  private getSynchronizedTime(): number {
    return this.getHighResolutionTime() + this.timeOffset;
  }

  private handleMessage(msg: any): void {
    const receiveTime = this.getHighResolutionTime();

    switch (msg.method) {
      case 'Connected':
        console.log('Connection confirmed:', msg.data);
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
        console.log('Other sessions:', msg.data);
        this.sessions.set(msg.data || []);
        break;

      case 'Ping':
        this.send('Pong', {
          serverTime: msg.timestamp,
          clientTime: this.getHighResolutionTime()
        });
        break;

      case 'Play':
        console.log('Received play command');
        // Apply audio delay compensation
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
        console.log('Received pause command');
        this.playerService.pause();
        break;

      case 'SetSong':
        console.log('Received set song command:', msg.data);
        this.playerService.setSong(msg.data);
        break;

      case 'UpdateTime': {
        console.log('Received time update:', msg.data);
        
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
          console.warn('Invalid UpdateTime data format:', msg.data);
          return;
        }

        // Calculate time with multiple compensation factors
        const now = this.getSynchronizedTime();
        const networkLatency = this.currentLatency / 1000; // Convert to seconds
        const audioDelay = this.getAudioDelay() / 1000; // Convert to seconds
        const timeSinceEvent = (now - eventTimestamp) / 1000;
        
        // Compensate for network latency, audio delay, and time since event
        const compensatedTime = sourceTime + networkLatency + audioDelay + timeSinceEvent;
        const finalTime = Math.max(0, compensatedTime);
        
        console.log(`Time sync - Original: ${sourceTime.toFixed(2)}s, Network: +${networkLatency.toFixed(3)}s, Audio: +${(audioDelay).toFixed(3)}s, Event delay: +${timeSinceEvent.toFixed(3)}s, Final: ${finalTime.toFixed(2)}s`);
        
        this.playerService.setCurrentTime(finalTime);
        break;
      }

      default:
        console.log('Unknown message method:', msg.method);
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = window.setTimeout(() => {
      if (this.username()) {
        console.log(`Reconnect attempt ${this.reconnectAttempts}`);
        this.establishConnection().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = window.setInterval(() => {
      if (this.isConnected() && this.ws?.readyState === WebSocket.OPEN) {
        // Send latency measurement ping
        const pingTime = this.getHighResolutionTime();
        this.send('LatencyPing', {
          clientTime: pingTime,
          calibration: false
        });
      }
    }, 10000); // Ping every 10 seconds for latency measurement
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
      console.log('Disconnecting from server');
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
      console.log('Setting song:', song);
      this.send('SetSong', song);
    } else {
      console.warn('Cannot set song: not connected');
    }
  }

  async play(): Promise<void> {
    if (this.isConnected() && this.connectionConfirmed) {
      console.log('Sending play command');
      this.send('Play', this.username());
    } else {
      console.warn('Cannot play: not connected');
    }
  }

  async pause(): Promise<void> {
    if (this.isConnected() && this.connectionConfirmed) {
      console.log('Sending pause command');
      this.send('Pause', this.username());
    } else {
      console.warn('Cannot pause: not connected');
    }
  }

  async updateTime(time: number): Promise<void> {
    if (this.isConnected() && this.connectionConfirmed) {
      console.log('Updating time:', time);
      this.send('UpdateTime', { 
        time,
        timestamp: this.getSynchronizedTime(), // Use synchronized time
        platform: this.platform,
        audioDelay: this.getAudioDelay()
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
        timestamp: this.getSynchronizedTime()
      };
      
      try {
        this.ws.send(JSON.stringify(message));
        console.log('Sent message:', message);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      console.warn('Cannot send message: WebSocket not open', { method, data });
    }
  }

  // Public getters for debugging/monitoring
  get currentLatencyMs(): number {
    return this.currentLatency;
  }

  get currentPlatform(): string {
    return this.platform;
  }

  get currentAudioDelay(): number {
    return this.getAudioDelay();
  }

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

  ngOnDestroy(): void {
    console.log('RemoteService destroyed, cleaning up');
    this.cleanup();
  }
}