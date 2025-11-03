// backend/src/routes/reports.ts
import express from "express";
import { TraccarService } from "../services/traccar";

const router = express.Router();
const traccar = new TraccarService();



router.get('/route', async (req, res) => {
  try {
    const { deviceId, from, to } = req.query;

    if (!deviceId || !from || !to) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // Ensure deviceId is an array
    const deviceIds = Array.isArray(deviceId)
      ? deviceId
      : String(deviceId).split(',').map((id) => id.trim()).filter(Boolean);

    if (deviceIds.length === 0) {
      return res.status(400).json({ error: 'Invalid deviceId(s)' });
    }

    // Fetch report from Traccar
    // Convert deviceId to number
    const deviceIdNum = Number(deviceId);
    const report = await traccar.getReport('route', deviceIdNum, String(from), String(to));

    res.json({ report });
  } catch (err: any) {
    console.error('Error in /reports/route:', err.message || err);
    res.status(500).json({ error: 'Failed to fetch report from Traccar' });
  }
});

export default router;
