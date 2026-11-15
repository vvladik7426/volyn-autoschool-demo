// Локальний перегляд: node serve.js  →  http://localhost:5181
const http = require("http"), fs = require("fs"), path = require("path");
const root = __dirname, port = process.env.PORT || 5181;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg" };
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  // Тестовий бекенд для локальної перевірки форми: backendUrl: "/mock-api"
  if (url === "/mock-api") {
    let body = ""; req.on("data", (c) => (body += c));
    return req.on("end", () => {
      if (req.method === "POST") console.log("[mock] заявка:", body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(req.method === "POST" ? { ok: true } : { ok: false, error: "not-configured" }));
    });
  }
  let file = path.normalize(path.join(root, url === "/" ? "index.html" : url));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(buf);
  });
}).listen(port, () => console.log(`Волинська: http://localhost:${port}`));
