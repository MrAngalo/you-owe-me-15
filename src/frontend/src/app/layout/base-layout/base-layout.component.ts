import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { filter, fromEvent } from 'rxjs';
import { ThemeService } from '../theme.service';

// The `md` breakpoint, where the header nav replaces the menu button
const DESKTOP_QUERY = '(min-width: 768px)';

@Component({
    selector: 'app-base-layout',
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './base-layout.component.html',
    styleUrl: './base-layout.component.scss',
    host: {
        // Keeps the footer at the bottom when the content is shorter than the viewport
        class: 'flex min-h-screen flex-col'
    }
})
export class BaseLayoutComponent {
    protected readonly theme = inject(ThemeService);

    private readonly drawer =
        viewChild.required<ElementRef<HTMLDialogElement>>('drawer');

    constructor() {
        /*
         * This listens if browser width changes, if hamburger menu is open and
         * the window becomes too wide, it will close the menu
         */
        fromEvent<MediaQueryListEvent>(matchMedia(DESKTOP_QUERY), 'change')
            .pipe(
                filter((event) => event.matches),
                takeUntilDestroyed()
            )
            .subscribe(() => this.closeMenu());
    }

    protected openMenu(): void {
        this.drawer().nativeElement.showModal();
    }

    protected closeMenu(): void {
        this.drawer().nativeElement.close();
    }

    // The panel fills the dialog, so a click that lands on the dialog itself hit the backdrop
    protected onDrawerClick(event: MouseEvent): void {
        if (event.target === this.drawer().nativeElement) {
            this.closeMenu();
        }
    }
}
