import path from "path";
import nunjucks from "nunjucks";
import { Mailer } from "./mailer";

const templates = new nunjucks.Environment(
    new nunjucks.FileSystemLoader(path.join(__dirname, "templates")),
    { autoescape: true }
);

// Shown by clients that do not display HTML, and helps keep the email out of spam
const TEXT = `Reset your password

Hi alex_m,

We got a request to reset the password for your account.
Open this link to choose a new password:
https://youoweme15.com/reset-password

This link expires in 1 hour. If you didn't ask for this, you can ignore this email.
Your password won't change unless you use the link above.

© 2026 You Owe Me 15. All rights reserved.
`;

export async function sendResetPasswordEmail(
    mailer: Mailer,
    to: string
): Promise<void> {
    await mailer.transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject: "Reset your password",
        html: templates.render("reset-password.html", {
            buttonUrl: "https://youoweme15.com/reset-password"
        }),
        text: TEXT
    });
}
