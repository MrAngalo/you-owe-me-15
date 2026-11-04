# you-owe-me-15

## Node.js

Developed with Node.js v24.15.0.

## Install

```sh
npm install
cd src/frontend && npm install
```

Create a local `.env` from the template and edit the values.

```sh
cp .env.example .env
```

## Email

Emails are sent over SMTP. Any SMTP server works, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` in `.env` to match it.

The template defaults to Gmail. If using Gmail, set `SMTP_USER` and `MAIL_FROM` to the sending Gmail address, and `SMTP_PASS` to an app password:

1. Enable 2-Step Verification on the Google account
2. Create an app password at https://myaccount.google.com/apppasswords
3. Paste it into `SMTP_PASS` without spaces

Email clients load images from a public URL, so `MAIL_ASSETS_URL` cannot be localhost. Upload the contents of `src/backend/mail/assets/` to a public server, keeping the `img/` folder, and set `MAIL_ASSETS_URL` to the uploaded folder's URL.

## Development

Run both commands in separate terminals

```sh
npm run dev:backend
npm run dev:frontend
```

## Production

```sh
npm run build
npm start
```

## Database

After editing `src/backend/db/schema.ts`:

```sh
npm run db:generate
```

Apply migrations manually:

```sh
npm run db:migrate
```

Browse the database in the browser:

```sh
npm run db:studio
```
