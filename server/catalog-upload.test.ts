import { describe, expect, it, vi } from "vitest";

const { storagePut } = vi.hoisted(() => ({
  storagePut: vi.fn().mockResolvedValue({ key: "catalog/mock-image.png", url: "/manus-storage/catalog/mock-image.png" }),
}));
vi.mock("./storage", () => ({ storagePut }));

import { catalogAdminRouter } from "./routers/catalogAdmin";
import type { TrpcContext } from "./_core/context";

function adminContext(): TrpcContext {
  return {
    user: {
      id: 950,
      openId: "upload-admin",
      name: "Upload admin",
      email: "upload@example.com",
      loginMethod: "manus",
      role: "admin",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("catalogAdmin.uploadMedia", () => {
  it("rejects unsupported file types before attempting storage", async () => {
    const caller = catalogAdminRouter.createCaller(adminContext());
    await expect(caller.uploadMedia({ fileName: "notes.txt", mimeType: "text/plain", base64: "dGVzdA==" })).rejects.toThrow("Chỉ chấp nhận");
  });

  it("stores accepted media and returns a project storage URL", async () => {
    const caller = catalogAdminRouter.createCaller(adminContext());
    const result = await caller.uploadMedia({ fileName: "cover.png", mimeType: "image/png", base64: "AQID" });
    expect(storagePut).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ fileName: "cover.png", url: "/manus-storage/catalog/mock-image.png", sizeBytes: 3 });
  });
});
