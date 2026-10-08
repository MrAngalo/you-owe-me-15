import express from "express";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get("/", (_req, res) => {
    res.send("Hello from Express + TypeScript");
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
