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

// "unavailable": the server could not answer
type ForgotPasswordProblem = 'unavailable';

// Set by the page that redirected here. "reset-invalid": the reset link was invalid or expired
type ForgotPasswordNotice = 'reset-invalid';

@Component({
    selector: 'app-forgot-password-page',
    imports: [ReactiveFormsModule, RouterLink, IconComponent],
    templateUrl: './forgot-password-page.component.html',
    styleUrls: ['../auth-styles.scss', './forgot-password-page.component.scss']
})
export class ForgotPasswordPageComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly injector = inject(Injector);

    protected readonly form = inject(NonNullableFormBuilder).group({
        email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]]
    });

    // Field errors stay hidden until the first submit
    protected readonly submitted = signal(false);
    protected readonly busy = signal(false);
    protected readonly problem = signal<ForgotPasswordProblem | null>(null);

    // Read from the navigation state
    protected readonly notice = signal<ForgotPasswordNotice | null>(
        this.router.currentNavigation()?.extras.state?.['notice'] ?? null
    );

    private readonly emailInput =
        viewChild.required<ElementRef<HTMLInputElement>>('emailInput');
    private readonly submitButton =
        viewChild.required<ElementRef<HTMLButtonElement>>('submitButton');

    protected submit(): void {
        if (this.busy()) {
            return;
        }
        this.submitted.set(true);
        this.problem.set(null);
        this.notice.set(null);

        if (this.form.controls.email.invalid) {
            this.emailInput().nativeElement.focus();
            return;
        }

        this.busy.set(true);
        this.auth.forgotPassword(this.form.getRawValue()).subscribe({
            next: () =>
                this.router.navigateByUrl('/sign-in', {
                    state: { notice: 'reset-requested' }
                }),
            error: () => this.onError()
        });
    }

    private onError(): void {
        // The email is kept so the user can try again
        this.busy.set(false);
        this.problem.set('unavailable');

        // The submit button is still disabled until the next render
        afterNextRender(() => this.submitButton().nativeElement.focus(), {
            injector: this.injector
        });
    }
}
