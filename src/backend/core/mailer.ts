import nodemailer, { Transporter } from "nodemailer";
import nunjucks from "nunjucks";
import path from "path";

const TEMPLATES_DIR = path.join(__dirname, "../templates");

export const htmlTemplates = new nunjucks.Environment(
    new nunjucks.FileSystemLoader(TEMPLATES_DIR),
    { autoescape: true }
);

// Plain text is not HTML, so escaping would show "&lt;" instead of "<"
export const textTemplates = new nunjucks.Environment(
    new nunjucks.FileSystemLoader(TEMPLATES_DIR),
    { autoescape: false }
);

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
