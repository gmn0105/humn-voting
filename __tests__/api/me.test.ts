import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedRequest, createRequest } from "@/__tests__/utils/request";

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

describe("GET /api/me", () => {
  beforeEach(() => {
    mockVerifyToken.mockResolvedValue({
      sub: "test-alien-123",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });
  });

  it("returns alienId when valid auth", async () => {
    const { GET } = await import("@/app/api/me/route");
    const req = createAuthenticatedRequest("http://localhost/api/me");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ alienId: "test-alien-123" });
  });

  it("returns 401 when no auth", async () => {
    const { GET } = await import("@/app/api/me/route");
    const req = createRequest("http://localhost/api/me", { headers: {} });
    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
