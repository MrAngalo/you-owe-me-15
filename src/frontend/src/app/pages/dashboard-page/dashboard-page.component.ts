import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/auth.service';

@Component({
    selector: 'app-dashboard-page',
    templateUrl: './dashboard-page.component.html'
})
export class DashboardPageComponent {
    private readonly router = inject(Router);

    // Stays null until the server answers, so the greeting never shows a blank name
    protected readonly username = signal<string | null>(null);

    constructor() {
        inject(AuthService)
            .me()
            .pipe(takeUntilDestroyed())
            .subscribe({
                next: (user) => this.username.set(user.username),
                // Not signed in, or the session expired
                error: () => this.router.navigateByUrl('/sign-in')
            });
    }
}
