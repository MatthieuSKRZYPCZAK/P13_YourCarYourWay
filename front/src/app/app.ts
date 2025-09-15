import {Component, inject, signal} from '@angular/core';
import {RouterLink, RouterOutlet} from '@angular/router';
import {AuthService} from './services/auth.service';
import {Chat} from './pages/chat/chat';
import {NgOptimizedImage} from '@angular/common';
import {ChatService} from './services/chat.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, Chat,  NgOptimizedImage],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('front');
  private auth = inject(AuthService);
  private chat = inject(ChatService);

  me() { return this.auth.me(); }
  connected = this.chat.connected;

  logout() {
    this.auth.logout();
  }
}
