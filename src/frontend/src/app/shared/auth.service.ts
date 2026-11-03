import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface SignInRequest {
    email: string;
    password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);

    signIn(credentials: SignInRequest): Observable<void> {
        return this.http.post<void>('/api/auth/sign-in', credentials);
    }
}
