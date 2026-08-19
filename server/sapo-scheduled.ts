import type { Request, Response } from "express";
import * as db from "./db";
import { pullSapoInventoryBySku } from "./sapo";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

const DEFAULT_SAPO_LOCATION_ID = "529110";

/**
 * Heartbeat callback for the project-level Sapo inbound inventory job.
 * The cron identity is the only trusted selector; request body is ignored.
 */
export async function handleSapoInventoryHeartbeat(req: Request, res: Response) {
  const timestamp = new Date().toISOString();
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only", timestamp });

    const owner = await db.getUserByOpenId(ENV.ownerOpenId);
    if (!owner) return res.status(200).json({ ok: true, skipped: "owner-not-found", taskUid: user.taskUid, timestamp });

    const locationId = process.env.SAPO_LOCATION_ID?.trim() || DEFAULT_SAPO_LOCATION_ID;
    const rows = (await db.getInventoryBoard())
      .filter(row => row.target === "variant" && row.isActive && row.sku.trim())
      .map(row => ({ localVariantId: row.id, sku: row.sku.trim(), available: row.stock }));
    const pulled = await pullSapoInventoryBySku(rows, locationId);
    const changes = pulled
      .filter(row => row.status === "pulled" && row.sapoAvailable !== undefined)
      .map(row => ({ localVariantId: row.localVariantId, sku: row.sku, stock: row.sapoAvailable as number, sapoVariantId: row.sapoVariantId, inventoryItemId: row.inventoryItemId }));
    const applied = await db.applySapoInboundInventory({ changes, performedByUserId: owner.id, reason: "Tự động đồng bộ Sapo/Shopee" });

    return res.json({ ok: true, taskUid: user.taskUid, locationId, scanned: rows.length, pulled: changes.length, updated: applied.updated, skipped: applied.skipped, failed: pulled.filter(row => row.status === "failed").length, timestamp });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sapo inbound heartbeat failed";
    console.error("[SapoInboundHeartbeat]", error);
    return res.status(500).json({ error: message, context: { url: req.originalUrl, taskUid: "cron" }, timestamp });
  }
}
