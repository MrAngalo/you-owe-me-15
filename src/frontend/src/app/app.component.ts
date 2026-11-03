import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BaseLayoutComponent } from './layout/base-layout/base-layout.component';

@Component({
    imports: [BaseLayoutComponent, RouterOutlet],
    selector: 'app-root',
    styleUrl: './app.component.css',
    templateUrl: './app.component.html'
})
export class AppComponent {}
