import express from "express";
import path from "path";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const STATIC_DIR = path.resolve(__dirname, "../../dist/static");
const WEB_DIR = path.resolve(__dirname, "../../dist/frontend");

app.use(express.json());

// Allows static files (images, fonts, icons) to be fetched under root
app.use(express.static(STATIC_DIR));

// This is needed because angular needs to see js and css files under root
app.use(express.static(WEB_DIR));

// Fallback, any path not defined is routed here
app.get("/{*path}", (req, res, next) => {
    // If path has extension, it is assumed to be a file. if not found, skip it and 404
    if (path.extname(req.path)) {
        return next();
    }

    res.sendFile(path.join(WEB_DIR, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
