import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyRequest } from "@/lib/auth";

const { mockVerifyToken } = vi.hoisted(() => ({ mockVerifyToken: vi.fn() }));
vi.mock("@alien_org/auth-client", () => ({
  createAuthClient: () => ({ verifyToken: mockVerifyToken }),
  JwtErrors: {
    JWTExpired: class JWTExpired extends Error {
      constructor() {
        super("JWT expired");
        this.name = "JWTExpired";
      }
    },
    JOSEError: class JOSEError extends Error {
      constructor() {
        super("JOSE error");
        this.name = "JOSEError";
      }
    },
  },
}));

describe("lib/auth", () => {
  beforeEach(() => {
    mockVerifyToken.mockResolvedValue({
      sub: "test-alien-123",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });
  });

  it("returns alienId when valid Bearer token is present", async () => {
    const req = new Request("http://localhost/api/me", {
      headers: { Authorization: "Bearer valid-token" },
    });
    const result = await verifyRequest(req);
    expect(result).toMatchObject({ alienId: "test-alien-123" });
    expect(result.exp).toBeDefined();
    expect(result.iat).toBeDefined();
  });

  it("accepts Bearer token with different casing", async () => {
    const req = new Request("http://localhost/api/me", {
      headers: { Authorization: "bearer valid-token" },
    });
    const result = await verifyRequest(req);
    expect(result.alienId).toBe("test-alien-123");
  });

  it("throws when Authorization header is missing", async () => {
    const req = new Request("http://localhost/api/me", { headers: {} });
    await expect(verifyRequest(req)).rejects.toThrow("Missing authorization token");
  });

  it("throws when Authorization header is empty", async () => {
    const req = new Request("http://localhost/api/me", {
      headers: { Authorization: "" },
    });
    await expect(verifyRequest(req)).rejects.toThrow("Missing authorization token");
  });

  it("throws when verifyToken rejects", async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error("Invalid token"));

    const req = new Request("http://localhost/api/me", {
      headers: { Authorization: "Bearer bad-token" },
    });
    await expect(verifyRequest(req)).rejects.toThrow("Invalid token");
  });
});
