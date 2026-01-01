import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  dsn?: string;
  isAlive?: boolean;
}

interface WebSocketMessage {
  type: 'error' | 'performance' | 'alert';
  data: any;
  dsn: string;
  timestamp: number;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  init(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws: AuthenticatedWebSocket, request) => {
      console.log('[WebSocket] New connection attempt');
      
      // 设置心跳
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // 处理认证
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'auth') {
            this.authenticateClient(ws, data.token, data.dsn);
          }
        } catch (error) {
          console.error('[WebSocket] Message parse error:', error);
          ws.close(1003, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.removeClient(ws);
        console.log('[WebSocket] Client disconnected');
      });

      ws.on('error', (error) => {
        console.error('[WebSocket] Connection error:', error);
        this.removeClient(ws);
      });
    });

    // 心跳检测
    const heartbeat = setInterval(() => {
      this.wss?.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (!ws.isAlive) {
          console.log('[WebSocket] Terminating dead connection');
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30秒心跳

    this.wss.on('close', () => {
      clearInterval(heartbeat);
    });

    console.log('[WebSocket] Service initialized');
  }

  private authenticateClient(ws: AuthenticatedWebSocket, token: string, dsn: string) {
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      ws.userId = decoded.userId;
      ws.dsn = dsn;
      
      // 添加到对应 DSN 的客户端列表
      if (!this.clients.has(dsn)) {
        this.clients.set(dsn, new Set());
      }
      this.clients.get(dsn)!.add(ws);
      
      // 发送认证成功消息
      ws.send(JSON.stringify({
        type: 'auth_success',
        message: 'WebSocket authenticated successfully'
      }));
      
      console.log(`[WebSocket] Client authenticated for DSN: ${dsn}, User: ${decoded.userId}`);
    } catch (error) {
      console.error('[WebSocket] Authentication failed:', error);
      ws.close(1008, 'Authentication failed');
    }
  }

  private removeClient(ws: AuthenticatedWebSocket) {
    if (ws.dsn && this.clients.has(ws.dsn)) {
      this.clients.get(ws.dsn)!.delete(ws);
      
      // 如果该 DSN 没有客户端了，删除空的 Set
      if (this.clients.get(ws.dsn)!.size === 0) {
        this.clients.delete(ws.dsn);
      }
    }
  }

  // 广播消息到指定 DSN 的所有客户端
  broadcast(dsn: string, message: WebSocketMessage) {
    const clients = this.clients.get(dsn);
    if (!clients || clients.size === 0) {
      return;
    }

    const messageStr = JSON.stringify(message);
    
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });

    console.log(`[WebSocket] Broadcasted ${message.type} to ${clients.size} clients for DSN: ${dsn}`);
  }

  // 获取连接统计
  getStats() {
    const stats = {
      totalConnections: 0,
      dsnConnections: {} as Record<string, number>
    };

    this.clients.forEach((clients, dsn) => {
      const activeClients = Array.from(clients).filter(
        client => client.readyState === WebSocket.OPEN
      ).length;
      
      stats.dsnConnections[dsn] = activeClients;
      stats.totalConnections += activeClients;
    });

    return stats;
  }
}

export const websocketService = new WebSocketService();