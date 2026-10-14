# you-owe-me-15

## Node.js

Developed with Node.js v24.15.0.

## Install

```sh
npm install
cd src/frontend && npm install
```

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
