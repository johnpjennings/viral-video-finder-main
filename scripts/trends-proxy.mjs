import http from "node:http";

const port = Number(process.env.TRENDS_PROXY_PORT || 4173);
const targetOrigin = "https://trends.google.com";

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.url.startsWith("/trends/")) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  try {
    const targetUrl = new URL(req.url, targetOrigin);
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
        "Accept": req.headers["accept"] || "*/*",
      },
    });

    res.writeHead(response.status, {
      "Content-Type": response.headers.get("content-type") || "text/plain",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    });
    res.end(await response.text());
  } catch (error) {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Proxy error");
  }
});

server.listen(port, () => {
  console.log(`Trends proxy running at http://localhost:${port}`);
});
