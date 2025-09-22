import {Component, effect, EffectRef, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild} from '@angular/core';
import {AuthService} from '../../services/auth.service';

import {FormsModule} from '@angular/forms';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {ChatService} from '../../services/chat.service';
import {ChatMessage} from '../../models/chat-message';


@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgOptimizedImage
  ],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css']
})
export class Chat implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private chat = inject(ChatService);

  @ViewChild('threadRef') threadRef!: ElementRef<HTMLDivElement>;

  open = signal(false);
  unread = signal(0);

  me = this.auth.me;
  connected = this.chat.connected;
  messages = this.chat.messages;
  input = signal('');

  private stopAuthEffect?: EffectRef;
  private lastKey: string | null = null;

  constructor() {
    this.stopAuthEffect = effect(() => {
      const u = this.me();
      const key = JSON.stringify({ u: u?.username ?? null, r: u?.role ?? null });
      if (key !== this.lastKey) {
        this.open.set(false);
        this.unread.set(0);
        this.input.set('');

        this.chat.resetConnection(true);
        this.lastKey = key;
      }
    });
  }

  ngOnInit(): void {
    const me = this.auth.me();
    if(me?.role !== 'EMPLOYEE') {
      this.chat.connectClient();
    } else {
      this.chat.connectSupport();
    }
  }

  isMine(m: ChatMessage): boolean {
    const u = this.me();

    // Authentifié : mon message si sender === mon username
    if (m?.sender && u?.username && m.sender === u.username) return true;

    // Invité : mon message si (pas de sender) + role=GUEST + même clientId
    const role = (m as any).role ?? (m as any).senderRole;
    return !m?.sender
      && (role === 'GUEST' || role === 'ROLE_GUEST')
      && (m?.clientId === this.chat.clientId);
  }

  displayName(m: ChatMessage): string {
    if (this.isMine(m)) return 'moi';

    const base = m?.sender ?? 'guest';
    const role = (m as any).role ?? (m as any).senderRole; // fallback

    const isEmp = role === 'EMPLOYEE' || role === 'ROLE_EMPLOYEE';
    return isEmp ? `${base} (support)` : base;
  }

  toggle() {
    this.open.update(v => !v);
    if (this.open()) this.unread.set(0);
  }

  sendMessage(){
    const text = this.input().trim();
    if (!text) return;
    this.chat.sendToSupport(text, 'CHAT');
    this.input.set('');
  }

  trackByIdx = (i: number, _m: ChatMessage) => i;

  ngOnDestroy(): void {
    this.stopAuthEffect?.destroy();
  }

}
