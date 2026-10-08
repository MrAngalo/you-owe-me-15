import express from "express";
import path from "path";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const STATIC_DIR = path.resolve(__dirname, "../../dist/static");

app.use(express.json());
app.use(express.static(STATIC_DIR));

app.get("/", (_req, res) => {
    res.send("Hello from Express + TypeScript");
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
