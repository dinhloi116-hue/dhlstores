import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { getUserByUsername } from "./db";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

function createContext(user: TrpcContext["user"] = null) {
  const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }),
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
  return { ctx, cookies };
}

describe("local account authentication", () => {
  it("registers a username/password account, creates a secure session and never returns the password hash", async () => {
    const username = `local_${Date.now()}`;
    const { ctx, cookies } = createContext();
    const result = await appRouter.createCaller(ctx).auth.register({ username, password: "SafePassword#2026", name: "Khách DHL" });

    expect(result.user).toMatchObject({ username, loginMethod: "local", email: null, role: "user" });
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({ name: COOKIE_NAME, options: { httpOnly: true, secure: true, maxAge: 30 * 24 * 60 * 60 * 1_000 } });
    expect(cookies[0]?.value).not.toContain("SafePassword#2026");

    const stored = await getUserByUsername(username);
    expect(stored?.passwordHash).toMatch(/^scrypt\$/);
  });

  it("accepts the correct password, rejects an incorrect password, and links an unused email", async () => {
    const username = `signin_${Date.now()}`;
    const password = "AnotherSafePassword#2026";
    const registration = createContext();
    const registered = await appRouter.createCaller(registration.ctx).auth.register({ username, password });

    const signedIn = createContext();
    await expect(appRouter.createCaller(signedIn.ctx).auth.login({ username, password })).resolves.toMatchObject({ user: { username } });
    await expect(appRouter.createCaller(createContext().ctx).auth.login({ username, password: "WrongPassword#2026" })).rejects.toMatchObject({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });

    const authenticated = createContext(registered.user as TrpcContext["user"]);
    await expect(appRouter.createCaller(authenticated.ctx).auth.linkEmail({ email: `${username}@example.com` })).resolves.toEqual({ success: true });
    expect((await getUserByUsername(username))?.email).toBe(`${username}@example.com`);

    const adminContext = createContext({ ...registered.user, role: "admin" } as TrpcContext["user"]);
    await expect(appRouter.createCaller(adminContext.ctx).store.updateUserRole({ userId: registered.user.id, role: "admin" })).resolves.toEqual({ success: true });
    expect((await getUserByUsername(username))?.role).toBe("admin");
    await expect(appRouter.createCaller(adminContext.ctx).store.updateUserRole({ userId: registered.user.id, role: "user" })).rejects.toMatchObject({ message: "Bạn không thể tự gỡ quyền quản trị của chính mình" });
  });
});
