import axios from "axios";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.query.url as string;
  if (!url) return res.status(400).send("URL is required");
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    res.setHeader("Content-Type", response.headers["content-type"]);
    res.status(200).send(response.data);
  } catch (error) {
    res.status(500).send("Error proxying image");
  }
}
