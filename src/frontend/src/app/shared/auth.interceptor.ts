import {
    HttpErrorResponse,
    HttpInterceptorFn,
    HttpStatusCode
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, catchError, throwError } from 'rxjs';

// A 401 here means a wrong email or password, which the sign-in page shows itself
const SIGN_IN_URL = '/api/auth/sign-in';

/*
 * Sends the user to the sign-in page when any request answers 401, because the session
 * is missing, expired or was deleted by a password reset. Other errors are passed on
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
    const router = inject(Router);

    return next(request).pipe(
        catchError((error: unknown) => {
            if (
                error instanceof HttpErrorResponse &&
                error.status === HttpStatusCode.Unauthorized &&
                request.url !== SIGN_IN_URL
            ) {
                router.navigateByUrl('/sign-in', {
                    state: { notice: 'signed-out' }
                });
                // Callers never see the 401, so their error handlers cannot replace this navigation
                return EMPTY;
            }
            return throwError(() => error);
        })
    );
};
