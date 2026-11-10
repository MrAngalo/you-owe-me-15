import { z } from "zod";

// Used for a missing token here, and for an unknown or expired one by the routes
export const RESET_ERROR = "Reset link is invalid or expired";

// Letters, numbers and !@#$%^&* only. Also rejects an empty password
const PASSWORD_PATTERN = /^[A-Za-z0-9!@#$%^&*]+$/;
const PASSWORD_MIN_LENGTH = 8;

/*
 * A schema's error message is also used by its checks, so each field has one message.
 * Emails are trimmed and lowercased, so they are stored and matched without regard
 * to case or surrounding spaces
 */
const validEmail = z
    .string({ error: "Email is invalid" })
    .trim()
    .toLowerCase()
    // Matches email@example.com, with a top-level domain of at least two characters
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/);

// Rules for new passwords, used by register and reset password
const newPassword = z
    .string({
        error: `Password must be at least ${PASSWORD_MIN_LENGTH} letters, numbers or !@#$%^&*`
    })
    .min(PASSWORD_MIN_LENGTH)
    .regex(PASSWORD_PATTERN);

/*
 * POST /sign-in
 */
// Looser than register. Any email is looked up, and the password is only checked for its characters
export const signInBody = z.object({
    email: z.string({ error: "Email is required" }).trim().toLowerCase().min(1),
    password: z
        .string({
            error: "Password may only contain letters, numbers and !@#$%^&*"
        })
        .regex(PASSWORD_PATTERN)
});

/*
 * POST /register
 */
export const registerBody = z.object({
    username: z
        .string({
            error: "Username must be 3 to 24 letters, numbers or underscores"
        })
        .regex(/^\w{3,24}$/),
    email: validEmail,
    password: newPassword
});

/*
 * POST /forgot-password
 */
export const forgotPasswordBody = z.object({ email: validEmail });

/*
 * POST /reset-password
 */
export const resetPasswordVerifyBody = z.object({
    token: z.string({ error: RESET_ERROR })
});

// The reset password route parses the verify body first, so a dead link is reported before the password
export const resetPasswordBody = resetPasswordVerifyBody.extend({
    password: newPassword
});
