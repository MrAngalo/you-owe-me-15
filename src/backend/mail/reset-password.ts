import path from "path";
import nunjucks from "nunjucks";
import { Mailer } from "./mailer";

const loader = new nunjucks.FileSystemLoader(path.join(__dirname, "templates"));

const htmlTemplates = new nunjucks.Environment(loader, { autoescape: true });

// Plain text is not HTML, so escaping would show "&lt;" instead of "<"
const textTemplates = new nunjucks.Environment(loader, { autoescape: false });

export interface ResetPasswordUser {
    username: string;
    email: string;
}

export async function sendResetPasswordEmail(
    mailer: Mailer,
    user: ResetPasswordUser,
    token: string
): Promise<void> {
    const buttonUrl = `https://youoweme15.com/reset-password?token=${token}`;

    await mailer.transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: user.email,
        subject: "Reset your password",
        html: htmlTemplates.render("reset-password.html", { user, buttonUrl }),
        text: textTemplates.render("reset-password.txt", { user, buttonUrl })
    });
}
