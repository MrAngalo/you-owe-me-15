import { Routes } from '@angular/router';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { LandingPageComponent } from './pages/landing-page/landing-page.component';
import { ForgotPasswordPageComponent } from './pages/auth/forgot-password-page/forgot-password-page.component';
import { RegisterPageComponent } from './pages/auth/register-page/register-page.component';
import { SignInPageComponent } from './pages/auth/sign-in-page/sign-in-page.component';

export const routes: Routes = [
    { path: '', component: LandingPageComponent, title: 'You Owe Me 15' },
    {
        path: 'sign-in',
        component: SignInPageComponent,
        title: 'Sign in - You Owe Me 15'
    },
    {
        path: 'register',
        component: RegisterPageComponent,
        title: 'Create account - You Owe Me 15'
    },
    {
        path: 'forgot-password',
        component: ForgotPasswordPageComponent,
        title: 'Forgot password - You Owe Me 15'
    },
    {
        path: 'dashboard',
        component: DashboardPageComponent,
        title: 'Dashboard - You Owe Me 15'
    }
];
