import {Component, OnDestroy, signal} from '@angular/core';
import {AuthService} from '../../services/auth.service';
import {Router, RouterLink} from '@angular/router';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import {finalize, Subject, takeUntil} from 'rxjs';
import {LoginRequest} from './interfaces/loginRequest.interface';
import {MatCard} from '@angular/material/card';
import {MatFormField, MatLabel} from '@angular/material/form-field';
import {MatIcon} from '@angular/material/icon';


@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ReactiveFormsModule,
    MatCard,
    MatFormField,
    MatLabel,
    MatIcon,
    MatInputModule
  ],
  templateUrl: './signin.html',
  styleUrls: ['./signin.css']
})
export class Signin implements OnDestroy {
  loginForm: FormGroup;
  private readonly destroy$: Subject<void> = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: [''],
      password: ['']
    })
  }
  me() { return this.authService.me(); }
  loading = signal(false);
  error = signal<string | null>(null);

  onSubmit() {
    const credentials: LoginRequest = this.loginForm.value;
    this.error.set(null);
    this.loading.set(true);

    this.authService.login(credentials)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (res) => {
          if(res.token) {
            // localStorage.setItem('token', res.token);
            this.authService.loadMe();
            void this.router.navigate(['/']);
          } else {
            this.error.set('Identifiants invalides')
          }
      },
        error: error => {
          this.error.set('Identifiants invalides')
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
