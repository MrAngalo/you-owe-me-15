import { HttpErrorResponse } from '@angular/common/http';
import {
    Component,
    ElementRef,
    Injector,
    afterNextRender,
    inject,
    signal,
    viewChild
} from '@angular/core';
import {
    NonNullableFormBuilder,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../shared/auth.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { EMAIL_PATTERN } from '../../../shared/validation';

// "failed": wrong credentials, "unavailable": the server could not answer
type SignInProblem = 'failed' | 'unavailable';

// Set by the page that redirected here. "registered": account created, "reset-requested": reset link asked for
type SignInNotice = 'registered' | 'reset-requested';

@Component({
    selector: 'app-sign-in-page',
    imports: [ReactiveFormsModule, RouterLink, IconComponent],
    templateUrl: './sign-in-page.component.html',
    styleUrls: ['../auth-styles.scss', './sign-in-page.component.scss']
})
export class SignInPageComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly injector = inject(Injector);

    protected readonly form = inject(NonNullableFormBuilder).group({
        email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
        password: ['', Validators.required]
    });

    // Field errors stay hidden until the first submit
    protected readonly submitted = signal(false);
    protected readonly busy = signal(false);
    protected readonly problem = signal<SignInProblem | null>(null);

    // Read from the navigation state
    protected readonly notice = signal<SignInNotice | null>(
        this.router.currentNavigation()?.extras.state?.['notice'] ?? null
    );

    private readonly emailInput =
        viewChild.required<ElementRef<HTMLInputElement>>('emailInput');
    private readonly passwordInput =
        viewChild.required<ElementRef<HTMLInputElement>>('passwordInput');
    private readonly submitButton =
        viewChild.required<ElementRef<HTMLButtonElement>>('submitButton');

    protected submit(): void {
        if (this.busy()) {
            return;
        }
        this.submitted.set(true);
        this.problem.set(null);
        this.notice.set(null);

        const { email, password } = this.form.controls;
        if (email.invalid) {
            this.emailInput().nativeElement.focus();
            return;
        }
        if (password.invalid) {
            this.passwordInput().nativeElement.focus();
            return;
        }

        this.busy.set(true);
        this.auth.signIn(this.form.getRawValue()).subscribe({
            next: () => this.router.navigateByUrl('/dashboard'),
            error: (error: HttpErrorResponse) => this.onError(error)
        });
    }

    private onError(error: HttpErrorResponse): void {
        this.busy.set(false);

        let target: ElementRef<HTMLElement>;
        if (error.status === 401) {
            // The email is kept, the password is cleared without flagging it as missing
            this.problem.set('failed');
            this.submitted.set(false);
            this.form.controls.password.reset();
            target = this.passwordInput();
        } else {
            this.problem.set('unavailable');
            target = this.submitButton();
        }

        // The submit button is still disabled until the next render
        afterNextRender(() => target.nativeElement.focus(), {
            injector: this.injector
        });
    }
}
