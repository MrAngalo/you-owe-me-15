import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

// Same key as the script in index.html
const THEME_KEY = 'yom15-theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly root = inject(DOCUMENT).documentElement;

    readonly isDark = signal(this.root.classList.contains('dark'));

    constructor() {
        // This listens for the OS dark mode change and overrides user's preferences
        fromEvent<MediaQueryListEvent>(matchMedia(DARK_QUERY), 'change')
            .pipe(takeUntilDestroyed())
            .subscribe((event) => {
                this.apply(event.matches ? 'dark' : 'light');
                clearTheme();
            });
    }

    toggle(): void {
        const theme = this.isDark() ? 'light' : 'dark';
        this.apply(theme);
        saveTheme(theme);
    }

    private apply(theme: Theme): void {
        this.root.classList.toggle('dark', theme === 'dark');
        this.isDark.set(theme === 'dark');
    }
}

function clearTheme(): void {
    try {
        localStorage.removeItem(THEME_KEY);
    } catch {
        // Nothing was saved to clear.
    }
}

function saveTheme(theme: Theme): void {
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch {
        // The choice could not be saved.
    }
}
