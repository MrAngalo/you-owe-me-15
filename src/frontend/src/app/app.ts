import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BaseLayoutComponent } from './layout/base-layout/base-layout.component';

@Component({
    imports: [BaseLayoutComponent, RouterOutlet],
    selector: 'app-root',
    styleUrl: './app.css',
    templateUrl: './app.html'
})
export class App {}
