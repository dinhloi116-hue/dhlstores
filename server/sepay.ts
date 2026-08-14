import type { Express, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import * as db from "./db";
import { ENV } from "./_core/env";

const sepayWebhookSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(value => String(value)),
  gateway: z.string().optional().default(""),
  transactionDate: z.string().optional(),
  accountNumber: z.string().optional(),
  content: z.string().optional().default(""),
  description: z.string().optional().default(""),
  transferType: z.string(),
  transferAmount: z.coerce.number().positive(),
  referenceCode: z.string().optional().default(""),
});

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function getAuthorizationKey(req: Request) {
  const header = req.header("authorization") ?? "";
  return header.startsWith("Apikey ") ? header.slice("Apikey ".length).trim() : "";
}

export type SePayQrConfig = {
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
};

/** Tạo URL QR theo chuẩn VietQR/SePay; nội dung VietinBank luôn có tiền tố SEVQR. */
export function buildSePayQrUrlFromConfig(config: SePayQrConfig, orderCode: string, totalAmount: number) {
  if (!config.bankCode || !config.accountNumber || !config.accountHolder) {
    return null;
  }

  const params = new URLSearchParams({
    acc: config.accountNumber,
    bank: config.bankCode,
    amount: Math.round(totalAmount).toString(),
    des: `SEVQR ${orderCode}`,
    template: "compact",
    showinfo: "true",
    fullacc: "true",
    holder: config.accountHolder,
    store: "DHL Stores",
  });

  return `https://vietqr.app/img?${params.toString()}`;
}

/** Tạo URL QR từ cấu hình môi trường của DHL Stores. */
export function buildSePayQrUrl(orderCode: string, totalAmount: number) {
  return buildSePayQrUrlFromConfig({
    bankCode: ENV.sepayBankCode,
    accountNumber: ENV.sepayAccountNumber,
    accountHolder: ENV.sepayAccountHolder,
  }, orderCode, totalAmount);
}

/** QR VietQR dành riêng cho đơn hàng vật lý, do chủ cửa hàng cấu hình trong Trung tâm vận hành. */
export function buildPhysicalVietQrUrl(config: SePayQrConfig, orderCode: string, totalAmount: number) {
  if (!config.bankCode || !config.accountNumber || !config.accountHolder) return null;
  const params = new URLSearchParams({
    amount: Math.round(totalAmount).toString(),
    addInfo: `SEVQR ${orderCode}`,
    accountName: config.accountHolder,
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(config.bankCode)}-${encodeURIComponent(config.accountNumber)}-compact2.png?${params.toString()}`;
}

/** QR chung của cửa hàng: chỉ có tài khoản nhận và số tiền, không ép khách nhập nội dung chuyển khoản. */
export function buildStoreVietQrUrl(config: SePayQrConfig, totalAmount: number) {
  if (!config.bankCode || !config.accountNumber || !config.accountHolder) return null;
  const params = new URLSearchParams({
    amount: Math.round(totalAmount).toString(),
    accountName: config.accountHolder,
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(config.bankCode)}-${encodeURIComponent(config.accountNumber)}-compact2.png?${params.toString()}`;
}

export function registerSePayWebhook(app: Express) {
  app.post("/api/sepay/webhook", async (req: Request, res: Response) => {
    if (!ENV.sepayWebhookApiKey) {
      return res.status(503).json({ success: false, message: "Payment webhook is not configured" });
    }

    if (!safeEqual(getAuthorizationKey(req), ENV.sepayWebhookApiKey)) {
      return res.status(401).json({ success: false, message: "Unauthorized webhook" });
    }

    const parsed = sepayWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Invalid webhook payload" });
    }

    const payment = parsed.data;
    if (payment.transferType.toLowerCase() !== "in") {
      return res.status(200).json({ success: true, ignored: true });
    }

    const result = await db.confirmSePayPayment({
      providerTransactionId: payment.id,
      transferAmount: payment.transferAmount,
      transferContent: payment.content || payment.description,
      gateway: payment.gateway,
      paymentReference: payment.referenceCode,
    });

    if (!result.success) {
      return res.status(200).json({ success: true, ignored: true, reason: result.reason });
    }

    return res.status(200).json({ success: true, alreadyProcessed: result.alreadyProcessed ?? false });
  });
}
