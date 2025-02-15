import WebSocket from 'ws';
import { logger } from '../utils/logger';


export class WebSocketService {
  private static connections: Map<string, WebSocket> = new Map();

  static async sendToUser(userId: string, event: string, data: any): Promise<void> {
    const connection = this.connections.get(userId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      try {
        connection.send(JSON.stringify({ event, data }));
      } catch (error) {
        logger.error('WebSocket send error:', error);
        throw error;
      }
    }
  }

  static registerConnection(userId: string, ws: WebSocket): void {
    this.connections.set(userId, ws);
    ws.on('close', () => this.connections.delete(userId));
  }
} 