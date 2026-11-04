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
import {
    EMAIL_PATTERN,
    PASSWORD_MIN_LENGTH,
    PASSWORD_PATTERN,
    USERNAME_PATTERN
} from '../../../shared/validation';

// "unavailable": the server could not answer. A taken username is shown on the field instead
type RegisterProblem = 'unavailable';

@Component({
    selector: 'app-register-page',
    imports: [ReactiveFormsModule, RouterLink, IconComponent],
    templateUrl: './register-page.component.html',
    styleUrls: ['../auth-styles.scss', './register-page.component.scss']
})
export class RegisterPageComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly injector = inject(Injector);

    protected readonly form = inject(NonNullableFormBuilder).group({
        username: [
            '',
            [Validators.required, Validators.pattern(USERNAME_PATTERN)]
        ],
        email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
        password: [
            '',
            [
                Validators.required,
                Validators.minLength(PASSWORD_MIN_LENGTH),
                Validators.pattern(PASSWORD_PATTERN)
            ]
        ]
    });

    // Field errors stay hidden until the first submit
    protected readonly submitted = signal(false);
    protected readonly busy = signal(false);
    protected readonly problem = signal<RegisterProblem | null>(null);

    private readonly usernameInput =
        viewChild.required<ElementRef<HTMLInputElement>>('usernameInput');
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

        const { username, email, password } = this.form.controls;
        if (username.invalid) {
            this.usernameInput().nativeElement.focus();
            return;
        }
        if (email.invalid) {
            this.emailInput().nativeElement.focus();
            return;
        }
        if (password.invalid) {
            this.passwordInput().nativeElement.focus();
            return;
        }

        this.busy.set(true);
        this.auth.register(this.form.getRawValue()).subscribe({
            next: () =>
                this.router.navigateByUrl('/sign-in', {
                    state: { notice: 'registered' }
                }),
            error: (error: HttpErrorResponse) => this.onError(error)
        });
    }

    private onError(error: HttpErrorResponse): void {
        this.busy.set(false);

        let target: ElementRef<HTMLElement>;
        if (error.status === 409) {
            // Angular drops this error as soon as the username is edited
            this.form.controls.username.setErrors({ taken: true });
            target = this.usernameInput();
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
