import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  connect(onConnect) {
    if (this.client) return;

    this.client = new Client({
      // We use webSocketFactory because SockJS is required
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = (frame) => {
      this.connected = true;
      console.log('Connected: ' + frame);
      if (onConnect) onConnect();
    };

    this.client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    this.client.activate();
  }

  subscribe(destination, callback) {
    if (!this.connected || !this.client) {
      console.warn('Cannot subscribe because STOMP is not connected.');
      return;
    }
    return this.client.subscribe(destination, (msg) => {
      if (msg.body) {
        callback(JSON.parse(msg.body));
      }
    });
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.connected = false;
      this.client = null;
    }
  }
}

export const wsService = new WebSocketService();
