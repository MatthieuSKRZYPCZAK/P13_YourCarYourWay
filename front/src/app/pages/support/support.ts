import {Component, inject, OnInit, signal, computed, ViewChild, ElementRef} from '@angular/core';
import {CommonModule, DatePipe} from '@angular/common';
import {ChatService} from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import {uuid} from '../../utils/uuid.util';

type MessageItem = {
  id: string;
  from: 'client' | 'support';
  content: string;
  at: string;
  sender?: string | null;
};


type Conversation = {
  key: string;
  clientId: string;
  display: string;
  lastAt: number;
  unread: number;
  messages: MessageItem[];
};

function convKeyOf(evt: any): string {
  const hasUser = !!evt.sender && evt.role && evt.role !== 'GUEST';
  return hasUser ? `user:${evt.sender}` : `guest:${evt.clientId}`;
}

function displayOf(evt: any): string {
  const hasUser = !!evt.sender && evt.role && evt.role !== 'GUEST';
  return hasUser ? evt.sender : `guest-${evt.clientId.slice(0, 6)}`;
}

@Component({
  selector: 'app-support',
  standalone: true,
  templateUrl: './support.html',
  styleUrls: ['./support.css'],
  imports: [CommonModule, DatePipe]
})
export class Support implements OnInit {
  private chat = inject(ChatService);
  private auth = inject(AuthService);

  private keyByClientId = new Map<string, string>();


  @ViewChild('threadRef') threadRef!: ElementRef<HTMLDivElement>;

  convs = signal<Map<string, Conversation>>(new Map());
  selectedId = signal<string | null>(null);
  messageTrigger = signal(0);

  convsList = computed(() => {
    const arr = Array.from(this.convs().values());
    arr.sort((a, b) => b.lastAt - a.lastAt);
    return arr;
  });

  selectedConv = computed(() => {
    const id = this.selectedId();
    return id ? (this.convs().get(id) ?? null) : null;
  });

  messagesOfSelected = computed<MessageItem[]>(() => {
    this.messageTrigger();
    const id = this.selectedId();
    const conv = id ? this.convs().get(id) : null;
    return conv?.messages ?? [];
  });


  private lastOptimisticByClient = new Map<string, { content: string; at: number }>();


  ngOnInit(): void {
    // Sécurité : ne connecter qu’un EMPLOYEE
    const me = this.auth.me?.();
    if (me?.role !== 'EMPLOYEE') return;

    this.chat.connectSupport();

    this.chat.adminMessages$.subscribe(evt => {
      const map = new Map(this.convs());

      const isSupportMsg = !!evt.role && (evt.role.includes('EMPLOYEE') || evt.role.includes('ROLE_EMPLOYEE'));

      let key: string;
      let existing: Conversation | undefined;


      if (isSupportMsg) {
        const prefKey = this.keyByClientId.get(evt.clientId);
        if (prefKey && map.has(prefKey)) {
          key = prefKey;
          existing = map.get(prefKey);
        } else {

          const selKey = this.selectedId();
          const selConv = selKey ? map.get(selKey) : undefined;
          if (selConv && selConv.clientId === evt.clientId) {
            key = selKey!;
            existing = selConv;
          } else {

            const candidates = Array.from(map.values()).filter(c => c.clientId === evt.clientId);
            if (candidates.length > 0) {
              candidates.sort((a, b) => b.lastAt - a.lastAt);
              existing = candidates[0];
              key = existing.key;
            } else {

              key = `guest:${evt.clientId}`;
              existing = undefined;
            }
          }
        }
      } else {
        key = convKeyOf(evt);
        existing = map.get(key);

        this.keyByClientId.set(evt.clientId, key);
      }

      const newMessage: MessageItem = {
        id: uuid(),
        from: isSupportMsg ? 'support' : 'client',
        content: evt.content,
        at: evt.timestamp,
        sender: evt.sender ?? null
      };

      let messages = existing?.messages ?? [];
      if (isSupportMsg) {
        const last = this.lastOptimisticByClient.get(evt.clientId);
        const evtTime = new Date(evt.timestamp).getTime();
        const echoLikely = !!last && last.content === evt.content && Math.abs(evtTime - last.at) < 2000;
        if (!echoLikely) messages = [...messages, newMessage];
        else this.lastOptimisticByClient.delete(evt.clientId);
      } else {
        messages = [...messages, newMessage];
      }

      const display = existing?.display ?? displayOf(evt);

      const selected = this.selectedId();
      const isSelected = selected === key;

      const updatedConv: Conversation = {
        key,
        clientId: evt.clientId,
        display,
        lastAt: Date.now(),
        unread: isSelected ? 0 : (existing?.unread ?? 0) + 1,
        messages
      };

      map.set(key, updatedConv);
      this.convs.set(map);

      if (!selected) this.selectedId.set(key);

      if (isSelected) {
        this.messageTrigger.update(v => v + 1);
        queueMicrotask(() => {
          const el = this.threadRef?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        });
      }
    });
  }

  select(key: string) {
    this.selectedId.set(key);
    const map = new Map(this.convs());
    const conv = map.get(key);
    if (conv) {
      conv.unread = 0;
      this.convs.set(map);

      this.keyByClientId.set(conv.clientId, key);
    }
    queueMicrotask(() => {
      const el = this.threadRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  reply(text: string) {
    const key = this.selectedId();
    const msg = text?.trim();
    if (!key || !msg) return;

    const conv = this.convs().get(key);
    if (!conv) return;

    this.keyByClientId.set(conv.clientId, key);

    this.chat.replyTo(conv.clientId, msg);



    const optimisticMsg: MessageItem = {
      id: uuid(),
      from: 'support',
      content: msg,
      at: new Date().toISOString(),
      sender: this.auth.me?.()?.username ?? 'support'
    };

    const updatedConv: Conversation = {
      ...conv,
      lastAt: Date.now(),
      messages: [...conv.messages, optimisticMsg]
    };

    const map = new Map(this.convs());
    map.set(key, updatedConv);
    this.convs.set(map);

    this.lastOptimisticByClient.set(conv.clientId, { content: msg, at: Date.now() });

    queueMicrotask(() => {
      const el = this.threadRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  deleteConversation(key: string) {
    const map = new Map(this.convs());
    const conv = map.get(key);
    if (!conv) return;

    map.delete(key);
    this.convs.set(map);

    if (this.selectedId() === key) {
      const next = Array.from(map.values())
        .sort((a, b) => b.lastAt - a.lastAt)[0];
      this.selectedId.set(next?.key ?? null);
    }

    queueMicrotask(() => {
      const el = this.threadRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
