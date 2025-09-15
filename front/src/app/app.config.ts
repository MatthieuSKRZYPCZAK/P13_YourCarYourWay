import {
  ApplicationConfig, inject,
  LOCALE_ID, provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {authTokenInterceptor} from './services/interceptors/auth-token.interceptor';
import {AuthService} from './services/auth.service';
import {firstValueFrom} from 'rxjs';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: LOCALE_ID, useValue: 'fr-FR'},
    provideHttpClient(withInterceptors([authTokenInterceptor])),

    provideAppInitializer(() => {
      const auth = inject(AuthService);
      return firstValueFrom(auth.restore$());
    }),
  ]
};
