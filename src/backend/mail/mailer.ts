import nodemailer, { Transporter } from "nodemailer";

export interface Mailer {
    transporter: Transporter;
    enabled: boolean;
}

export function createMailer(): Mailer {
    const port = Number(process.env.SMTP_PORT);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        // Port 465 encrypts from the start, other ports upgrade with STARTTLS
        secure: port === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        // Default is 2 minutes, too long to wait for an unreachable server
        connectionTimeout: 10_000
    });

    return { transporter, enabled: false };
}
