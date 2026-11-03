import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface SignInRequest {
    email: string;
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

    // Succeeds even when nobody is signed in
    signOut(): Observable<void> {
        return this.http.post<void>('/api/auth/sign-out', null);
    }

    // Fails with a 401 when nobody is signed in
    me(): Observable<CurrentUser> {
        return this.http.get<CurrentUser>('/api/auth/me');
    }
}
