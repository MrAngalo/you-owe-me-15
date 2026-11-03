import { Routes } from '@angular/router';
import { LandingPageComponent } from './pages/landing-page/landing-page.component';
import { SignInPageComponent } from './pages/sign-in-page/sign-in-page.component';

export const routes: Routes = [
    { path: '', component: LandingPageComponent, title: 'You Owe Me 15' },
    {
        path: 'sign-in',
        component: SignInPageComponent,
        title: 'Sign in - You Owe Me 15'
    }
];
