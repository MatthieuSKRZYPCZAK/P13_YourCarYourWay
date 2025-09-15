import { Injectable, signal } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import {ChatMessage} from '../models/chat-message';

export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private client: Client | null = null;
  private sub: StompSubscription | null = null;
  private mode: 'client' | 'support' | null = null;

  private _clientId = sessionStorage.getItem('chatClientId') ?? uuid();
  adminMessages$ = new Subject<any>();

  messages = signal<ChatMessage[]>([]);
  connected = signal(false);

  constructor(private auth: AuthService) {
    sessionStorage.setItem('chatClientId', this._clientId);
  }

  get clientId() { return this._clientId; }

  /** Coupe proprement la connexion STOMP et vide l’état local */
  private reset() {
    try { this.sub?.unsubscribe(); } catch {}
    this.sub = null;
    const old = this.client;
    this.client = null;
    this.connected.set(false);
    this.mode = null;
    if (old) old.deactivate();
  }

  /** ============= MODE CLIENT / GUEST ============= */
  connectClient() {
    if (this.mode !== 'client' && this.client?.active) this.reset();
    if (this.client?.active && this.mode === 'client') return;

    this.mode = 'client';
    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/api/ws-chat'),
      reconnectDelay: 2000,
      beforeConnect: () => {
        const headers: Record<string, string> = { 'X-Client-Id': this.clientId };
        const tok = this.auth.getToken?.();
        if (tok) headers['Authorization'] = `Bearer ${tok}`;
        this.client!.connectHeaders = headers;
      },
      onConnect: () => {
        this.connected.set(true);
        this.sub = this.client!.subscribe(`/queue/support/${this.clientId}`, (frame: IMessage) => {
          try {
            const msg = JSON.parse(frame.body) as ChatMessage;
            this.messages.update(list => [...list, msg]);
          } catch (e) { console.error('Invalid STOMP payload', e); }
        });
      },
      onStompError: () => this.connected.set(false),
      onWebSocketClose: () => this.connected.set(false),
      debug: m => console.log('[STOMP]', m),
    });

    this.client.activate();
  }

  sendToSupport(content: string, type: 'CHAT' | 'JOIN' | 'LEAVE' = 'CHAT') {

    if (!this.client || !this.connected()) return;

    const user = this.auth.me?.();
    const isGuest = this.auth.isGuest();

    const body = JSON.stringify({
      content,
      type,
      sender: isGuest ? null : user.username,
      role: isGuest ? 'GUEST' : user.role,
      clientId: this.clientId
    });

    this.client.publish({
      destination: '/app/support.message',
      body
    });
  }

  /** ============= MODE SUPPORT (EMPLOYEE) ============= */
  connectSupport() {
    if (this.mode !== 'support' && this.client?.active) this.reset();
    if (this.client?.active && this.mode === 'support') return;

    this.mode = 'support';
    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/api/ws-chat'),
      reconnectDelay: 2000,
      beforeConnect: () => {
        const tok = this.auth.getToken?.();
        this.client!.connectHeaders = tok ? { Authorization: `Bearer ${tok}` } : {};
      },
      onConnect: () => {
        this.connected.set(true);
        // ✅ Un EMPLOYEE écoute le topic admin (tous les messages clients)
        this.sub = this.client!.subscribe('/topic/support.admin', frame => {
          try { this.adminMessages$.next(JSON.parse(frame.body)); } catch (e) { console.error(e); }
        });
      },
      onStompError: () => this.connected.set(false),
      onWebSocketClose: () => this.connected.set(false),
      debug: m => console.log('[STOMP]', m),
    });

    this.client.activate();
  }

  replyTo(targetClientId: string, content: string) {
    const me = this.auth.me?.();
    this.client!.publish({
      destination: '/app/support.reply',
      body: JSON.stringify({
        targetClientId,
        content,
        type: 'CHAT',
        sender: me?.username ?? 'support'
      })
    });
  }

  resetConnection(reconnect: boolean) {
    this.sub?.unsubscribe();
    this.sub = null;
    const old = this.client;
    this.client = null;
    old?.deactivate();
    this.connected.set(false);
    this.messages.set([]);

    const me = this.auth.me();
    if(me?.role !== 'EMPLOYEE') {
      this.connectClient();
    } else {
      this.connectSupport();
    }
  }
}


