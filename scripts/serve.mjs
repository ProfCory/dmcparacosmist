import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".txt": "text/plain",
};
http
  .createServer(async (req, res) => {
    try {
      let target = path.resolve(
        root,
        "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
      );
      if (!target.startsWith(root + path.sep) && target !== root) throw Error();
      if ((await stat(target)).isDirectory())
        target = path.join(target, "index.html");
      res.writeHead(200, {
        "Content-Type":
          types[path.extname(target)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(await readFile(target));
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(Number(process.env.PORT) || 4173, "0.0.0.0", () =>
    console.log(
      "Studio: http://localhost:4173 — Game: http://localhost:4173/game/",
    ),
  );
