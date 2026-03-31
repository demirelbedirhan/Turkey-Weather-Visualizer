import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/weather/warnings", async (req, res) => {
    try {
      const response = await axios.get("https://servis.mgm.gov.tr/web/meteoalarm/today", {
        headers: {
          'Origin': 'https://www.mgm.gov.tr',
          'Referer': 'https://www.mgm.gov.tr/'
        }
      });
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching warnings:", error);
      res.status(500).json({ error: "Failed to fetch warnings" });
    }
  });

  // Proxy for MGM images if needed
  app.get("/api/proxy/image", async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).send("URL is required");
    try {
      const response = await axios.get(url, { responseType: "arraybuffer" });
      res.set("Content-Type", response.headers["content-type"]);
      res.send(response.data);
    } catch (error) {
      res.status(500).send("Error proxying image");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
