import {HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {AuthService} from '../auth.service';
import {MessageService} from '../message/message.service';
import {catchError, switchMap, throwError} from 'rxjs';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {

  const authService = inject(AuthService);
  const message = inject(MessageService);
  const token = authService.getToken();

  let requestToSend = req;

  const excludedUrls = ["/api/login", "/api/refresh"];

  const shouldSkip = excludedUrls.some((url) => req.url.includes(url));
  if (shouldSkip) {
    return next(req);
  }

  if(token) {
    const headers = req.headers.set('Authorization', 'Bearer ' + token);
    requestToSend = req.clone({
      headers: headers
    });
  }
  return next(requestToSend).pipe(
    catchError((error: HttpErrorResponse) => {
      if(error.status === 401) {

        const currentToken = authService.getToken();
        if(!currentToken) {
          authService.logout();
          message.showInfo("Votre session a expiré. Vous avez été déconnecté.");
          return throwError(() => error);
        }

        return authService.getRefreshToken().pipe(
          switchMap((userSession) => {
            const headers = req.headers.set('Authorization', 'Bearer ' + userSession.token);
            requestToSend = req.clone({
              headers: headers
            });
            return next(requestToSend);
          }),
          catchError((err) => {
            authService.logout();
            message.showInfo("Votre session a expiré. Vous avez été déconnecté.");
            return throwError(() => err);
          })
        )
      }
      return throwError(() => error);
    })
  );

};
