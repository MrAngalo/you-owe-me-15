import { htmlTemplates, Mailer, textTemplates } from "../core/mailer";

export interface ResetPasswordUser {
    username: string;
    email: string;
}

export async function sendResetPasswordEmail(
    mailer: Mailer,
    user: ResetPasswordUser,
    token: string
): Promise<void> {
    const url = new URL("/reset-password", process.env.APP_URL);
    url.searchParams.set("token", token);
    const buttonUrl = url.href;

    // Without the trailing slash, since the templates add "/img/..."
    const assetsUrl = process.env.MAIL_ASSETS_URL?.replace(/\/+$/, "");

    await mailer.transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: user.email,
        subject: "Reset your password",
        html: htmlTemplates.render("reset-password.html", {
            user,
            buttonUrl,
            assetsUrl
        }),
        text: textTemplates.render("reset-password.txt", { user, buttonUrl })
    });
}
