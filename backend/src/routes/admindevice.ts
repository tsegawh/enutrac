// backend/src/routes/adminDevice.ts
import express from "express";
import prisma from "../lib/prisma";
import axios from "axios";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const router = express.Router();

/**
 * GET /admin/devices/:id/positions
 * Resolve local device.id -> traccarId, then fetch positions from Traccar
 */
router.get(
  "/:id/positions",
  authMiddleware,
  adminMiddleware,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { from, to, limit = 1000, offset = 0 } = req.query;

      // 1. Lookup device in our DB
      const device = await prisma.device.findUnique({ where: { id } });
      if (!device || !device.traccarId) {
        return res.status(404).json({ error: "Device not found" });
      }

      // 2. Query Traccar API with traccarId
      const traccarResp = await axios.get(
        `${process.env.TRACCAR_API}/positions`,
        {
          params: {
            deviceId: device.traccarId,
            from,
            to,
            limit,
            offset,
          },
          auth: {
            username: process.env.TRACCAR_USER!,
            password: process.env.TRACCAR_PASS!,
          },
        }
      );

      res.json(traccarResp.data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * (Optional) GET /admin/devices/:id/report
 * Similar to positions but calling Traccar’s /reports/summary or /events
 */
router.get(
  "/:id/report",
  authMiddleware,
  adminMiddleware,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { from, to } = req.query;

      const device = await prisma.device.findUnique({ where: { id } });
      if (!device || !device.traccarId) {
        return res.status(404).json({ error: "Device not found" });
      }

      const traccarResp = await axios.get(
        `${process.env.TRACCAR_API}/reports/summary`,
        {
          params: {
            deviceId: device.traccarId,
            from,
            to,
          },
          auth: {
            username: process.env.TRACCAR_USER!,
            password: process.env.TRACCAR_PASS!,
          },
        }
      );

      res.json(traccarResp.data);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
