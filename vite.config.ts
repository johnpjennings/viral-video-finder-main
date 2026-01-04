import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/


function shortsProxy() {
  const cache = new Map<string, { isShorts: boolean; expiresAt: number }>();
  const ttlMs = 7 * 24 * 60 * 60 * 1000;
  const maxConcurrency = 8;

  const checkOne = async (id: string) => {
    const now = Date.now();
    const cached = cache.get(id);
    if (cached && cached.expiresAt > now) {
      return { id, isShorts: cached.isShorts, cached: true };
    }

    let response = await fetch(`https://www.youtube.com/shorts/${id}`, {
      method: "HEAD",
      redirect: "follow",
    });

    if (response.status === 405) {
      response = await fetch(`https://www.youtube.com/shorts/${id}`, {
        redirect: "follow",
      });
    }

    const finalUrl = response.url || `https://www.youtube.com/shorts/${id}`;
    const isShorts = finalUrl.includes("/shorts/");

    cache.set(id, { isShorts, expiresAt: now + ttlMs });

    return { id, isShorts, cached: false, status: response.status, finalUrl };
  };

  const mapWithConcurrency = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) => {
    const results: R[] = new Array(items.length);
    let index = 0;

    async function worker() {
      while (index < items.length) {
        const current = index++;
        results[current] = await fn(items[current]);
      }
    }

    const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
    await Promise.all(workers);
    return results;
  };

  return {
    name: "shorts-proxy",
    configureServer(server: any) {
      server.middlewares.use("/api/shorts-check", async (req: any, res: any) => {
        const url = new URL(req.url || "", "http://localhost");
        const id = url.searchParams.get("id");
        if (!id) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Missing id" }));
          return;
        }

        try {
          const result = await checkOne(id);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result));
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: error?.message || "Failed to check shorts" }));
        }
      });

      server.middlewares.use("/api/shorts-check-batch", async (req: any, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        let body = "";
        req.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            const payload = JSON.parse(body || "{}");
            const ids: string[] = Array.isArray(payload?.ids) ? payload.ids : [];
            if (ids.length === 0) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Missing ids" }));
              return;
            }

            const unique = Array.from(new Set(ids)).slice(0, 50);
            const results = await mapWithConcurrency(unique, maxConcurrency, checkOne);
            const map = Object.fromEntries(results.map((item: any) => [item.id, item.isShorts]));

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ results: map }));
          } catch (error: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: error?.message || "Failed to check shorts" }));
          }
        });
      });
    },
  };
}
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), shortsProxy()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
