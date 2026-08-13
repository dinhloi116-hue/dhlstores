import express from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { registerSePayWebhook } from "./sepay";

let server: Server | undefined;

afterEach(async () => {
  await new Promise<void>(resolve => server?.close(() => resolve()));
  server = undefined;
});

describe("SePay webhook API Key", () => {
  it("accepts a signed request using the configured project API Key", async () => {
    const apiKey = process.env.SEPAY_WEBHOOK_API_KEY;
    expect(apiKey, "SEPAY_WEBHOOK_API_KEY must be configured").toBeTruthy();

    const app = express();
    app.use(express.json());
    registerSePayWebhook(app);
    await new Promise<void>(resolve => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const port = (server.address() as { port: number }).port;

    const response = await fetch(`http://127.0.0.1:${port}/api/sepay/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Apikey ${apiKey}`,
      },
      body: JSON.stringify({
        id: "secret-validation-only",
        gateway: "VietinBank",
        content: "SEVQR DHLTESTVALIDATION",
        transferType: "in",
        transferAmount: 1,
        referenceCode: "validation-only",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
  });
});
