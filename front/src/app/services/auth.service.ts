import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginRequest } from '../pages/signin/interfaces/loginRequest.interface';
import {catchError, map, Observable, of, switchMap, tap, throwError} from 'rxjs';
import { Router } from '@angular/router';

export type Role = 'EMPLOYEE'|'CLIENT'|'GUEST';
export interface UserSessionInformation { token: string; username: string; role: Role }
export interface Me { authenticated: boolean; username: string; role: Role; }

const GUEST: Me = { authenticated: false, username: 'guest', role: "GUEST" }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  me = signal<Me>(GUEST);
  constructor(
    private router: Router,
  ) {}

  loadMe() {
    this.http.get<Me>('/api/me').subscribe({
      next: res => this.me.set(res),
      error: () => this.me.set({ authenticated: false, username: 'guest', role: 'GUEST' })
    });
  }

  login(credentials: LoginRequest): Observable<{ token: string}> {
    return this.http.post<{ token: string }>(`/api/login`, credentials, { withCredentials: true })
      .pipe(
        tap(res => {
          this.saveToken(res.token);
          this.loadMe();
        }),
      );
  }

  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  logout() {
    localStorage.removeItem('token');
    this.me.set({ authenticated: false, username: 'guest', role: 'GUEST' });
    void this.router.navigate(['']);
  }

  restore$() {
    const token = this.getToken();
    if (!token) {
      this.me.set(GUEST);
      return of(void 0);
    }
    return this.getCurrentUser().pipe(
      map(() => void 0),
      catchError(err => {

        if (err?.status === 401) {
          return this.getRefreshToken().pipe(
            switchMap(() => this.getCurrentUser()),
            map(() => void 0),
            catchError(() => { this.logout(); return of(void 0); })
          );
        }
        this.logout();
        return of(void 0);
      })
    );
  }

  isGuest(): boolean {
    const u = this.me();
    return !u || !u.authenticated || u.role === 'GUEST';
  }

  isAuthenticated(): Observable<boolean> {
    const token = this.getToken();
    if(!token) {
      return of(false);
    }
    if (this.me().authenticated) return of(true);

    return this.getCurrentUser().pipe(
      map(() => true),
      catchError(() => {
        this.logout();
        return of(false);
      })
    )
  }

  getCurrentUser(): Observable<Me> {
    return this.http.get<Me>("/api/me")
      .pipe(
        tap(me => this.me.set(me)),
        catchError(error => {
          if(error.status === 401) {
            return this.handleUnauthorizedError();
          }
          return throwError(() =>error);
        })
      );
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRefreshToken(): Observable<UserSessionInformation> {
    return this.http.post<UserSessionInformation>('/api/refresh', {}, { withCredentials: true })
      .pipe(
        tap((userSession: UserSessionInformation) => {
          this.saveToken(userSession.token);
          this.me.set({ authenticated: true, username: userSession.username, role: userSession.role });
        })
      );
  }

  private handleUnauthorizedError(): Observable<Me> {
    return this.getRefreshToken().pipe(
      switchMap(() => {
        return this.http.get<Me>("/api/me").pipe(
          tap(user => this.me.set(user))
        );
      }),
      catchError(refreshError => {
        this.logout();
        return throwError(() => refreshError);
      })
    );
  }
}
