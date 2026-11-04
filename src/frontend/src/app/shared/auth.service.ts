import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface SignInRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    password: string;
}

export interface CurrentUser {
    username: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);

    signIn(credentials: SignInRequest): Observable<void> {
        return this.http.post<void>('/api/auth/sign-in', credentials);
    }

    // Fails with a 409 when the username is taken. Does not sign the user in
    register(account: RegisterRequest): Observable<void> {
        return this.http.post<void>('/api/auth/register', account);
    }

    // Same answer whether or not an account uses the email
    forgotPassword(request: ForgotPasswordRequest): Observable<void> {
        return this.http.post<void>('/api/auth/forgot-password', request);
    }

    // Fails with a 400 when the reset link is invalid or expired
    verifyResetToken(token: string): Observable<void> {
        return this.http.post<void>('/api/auth/reset-password/verify', {
            token
        });
    }

    // Fails with a 400 when the reset link is invalid or expired. Signs out every session
    resetPassword(request: ResetPasswordRequest): Observable<void> {
        return this.http.post<void>('/api/auth/reset-password', request);
    }

    // Succeeds even when nobody is signed in
    signOut(): Observable<void> {
        return this.http.post<void>('/api/auth/sign-out', null);
    }

    // Fails with a 401 when nobody is signed in
    me(): Observable<CurrentUser> {
        return this.http.get<CurrentUser>('/api/auth/me');
    }
}
