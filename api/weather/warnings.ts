import axios from "axios";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const response = await axios.get("https://servis.mgm.gov.tr/web/meteoalarm/today", {
      headers: {
        'Origin': 'https://www.mgm.gov.tr',
        'Referer': 'https://www.mgm.gov.tr/'
      }
    });
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching warnings:", error);
    res.status(500).json({ error: "Failed to fetch warnings" });
  }
}
