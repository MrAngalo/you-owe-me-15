// Matches email@example.com, with a top-level domain of at least two characters
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// 3 to 24 letters, numbers or underscores
export const USERNAME_PATTERN = /^\w{3,24}$/;

// Same characters the sign-in API accepts, so every new password can be used to sign in
export const PASSWORD_PATTERN = /^[A-Za-z0-9!@#$%^&*]+$/;
export const PASSWORD_MIN_LENGTH = 8;
