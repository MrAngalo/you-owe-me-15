import { createHash, randomBytes } from "crypto";

// Random token for cookies and links, 32 bytes is too many to guess
export function createToken(): string {
    return randomBytes(32).toString("base64url");
}

// Only the hash of a token is stored, so a leaked database cannot be used to sign in
export function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}
