import { Location } from '@angular/common';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    AbstractControl,
    NonNullableFormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../shared/auth.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import {
    PASSWORD_MIN_LENGTH,
    PASSWORD_PATTERN
} from '../../../shared/validation';

// "unavailable": the server could not answer
type ResetPasswordProblem = 'unavailable';

// Sets "mismatch" on the form when the repeated password is different
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const { password, repeatPassword } = group.value;
    return password === repeatPassword ? null : { mismatch: true };
}

@Component({
    selector: 'app-reset-password-page',
    imports: [ReactiveFormsModule, RouterLink, IconComponent],
    templateUrl: './reset-password-page.component.html',
    styleUrls: ['../auth-styles.scss', './reset-password-page.component.scss']
})
export class ResetPasswordPageComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly location = inject(Location);
    private readonly injector = inject(Injector);

    // From the ?token= in the email link
    private readonly token =
        inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

    protected readonly form = inject(NonNullableFormBuilder).group(
        {
            password: [
                '',
                [
                    Validators.required,
                    Validators.minLength(PASSWORD_MIN_LENGTH),
                    Validators.pattern(PASSWORD_PATTERN)
                ]
            ],
            repeatPassword: ['', Validators.required]
        },
        { validators: passwordsMatch }
    );

    // The form stays hidden until the server accepts the link
    protected readonly verified = signal(false);

    // Field errors stay hidden until the first submit
    protected readonly submitted = signal(false);
    protected readonly busy = signal(false);
    protected readonly problem = signal<ResetPasswordProblem | null>(null);

    private readonly passwordInput =
        viewChild<ElementRef<HTMLInputElement>>('passwordInput');
    private readonly repeatPasswordInput = viewChild<
        ElementRef<HTMLInputElement>
    >('repeatPasswordInput');
    private readonly submitButton =
        viewChild<ElementRef<HTMLButtonElement>>('submitButton');

    constructor() {
        if (!this.token) {
            this.redirectInvalid();
            return;
        }

        this.auth
            .verifyResetToken(this.token)
            .pipe(takeUntilDestroyed())
            .subscribe({
                next: () => {
                    // Keeps the token out of the address bar and history
                    this.location.replaceState('/reset-password');
                    this.verified.set(true);
                },
                error: (error: HttpErrorResponse) => {
                    if (error.status === 400) {
                        this.redirectInvalid();
                    } else {
                        this.problem.set('unavailable');
                    }
                }
            });
    }

    protected submit(): void {
        if (this.busy()) {
            return;
        }
        this.submitted.set(true);
        this.problem.set(null);

        const { password, repeatPassword } = this.form.controls;
        if (password.invalid) {
            this.passwordInput()?.nativeElement.focus();
            return;
        }
        if (repeatPassword.invalid || this.form.hasError('mismatch')) {
            this.repeatPasswordInput()?.nativeElement.focus();
            return;
        }

        this.busy.set(true);
        this.auth
            .resetPassword({ token: this.token, password: password.value })
            .subscribe({
                next: () =>
                    this.router.navigateByUrl('/sign-in', {
                        state: { notice: 'password-reset' }
                    }),
                error: (error: HttpErrorResponse) => this.onError(error)
            });
    }

    private onError(error: HttpErrorResponse): void {
        // The link expired while the form was open
        if (error.status === 400) {
            this.redirectInvalid();
            return;
        }

        this.busy.set(false);
        this.problem.set('unavailable');

        // The submit button is still disabled until the next render
        afterNextRender(() => this.submitButton()?.nativeElement.focus(), {
            injector: this.injector
        });
    }

    // Replaces the history entry, so going back does not reopen the dead link
    private redirectInvalid(): void {
        this.router.navigateByUrl('/forgot-password', {
            state: { notice: 'reset-invalid' },
            replaceUrl: true
        });
    }
}
