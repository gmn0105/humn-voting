import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedRequest,
  createRequest,
} from "@/__tests__/utils/request";
import { getPaymentIntent, createPaymentIntent } from "@/lib/payments";

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

describe("POST /api/invoices", () => {
  beforeEach(() => {
    mockVerifyToken.mockResolvedValue({
      sub: "alien-1",
      exp: 0,
      iat: 0,
    });
    process.env.TREASURY_ALIEN_PROVIDER_ADDRESS = "treasury-alien-addr";
  });

  it("returns invoice, recipient, amount, token, network when valid", async () => {
    const { POST } = await import("@/app/api/invoices/route");
    const req = createAuthenticatedRequest("http://localhost/api/invoices", {
      method: "POST",
      body: { amount: "100", token: "ALIEN", network: "alien" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.invoice).toMatch(/^inv-/);
    expect(data.recipient).toBe("treasury-alien-addr");
    expect(data.amount).toBe("100");
    expect(data.token).toBe("ALIEN");
    expect(data.network).toBe("alien");
  });

  it("returns 400 when amount missing", async () => {
    const { POST } = await import("@/app/api/invoices/route");
    const req = createAuthenticatedRequest("http://localhost/api/invoices", {
      method: "POST",
      body: { token: "ALIEN", network: "alien" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("amount");
  });

  it("returns 400 when token invalid", async () => {
    const { POST } = await import("@/app/api/invoices/route");
    const req = createAuthenticatedRequest("http://localhost/api/invoices", {
      method: "POST",
      body: { amount: "100", token: "INVALID", network: "alien" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("token");
  });

  it("returns 503 when recipient not configured", async () => {
    delete process.env.TREASURY_ALIEN_PROVIDER_ADDRESS;
    const { POST } = await import("@/app/api/invoices/route");
    const req = createAuthenticatedRequest("http://localhost/api/invoices", {
      method: "POST",
      body: { amount: "100", token: "ALIEN", network: "alien" },
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    process.env.TREASURY_ALIEN_PROVIDER_ADDRESS = "treasury-alien-addr";
  });

  it("returns 401 when no auth", async () => {
    const { POST } = await import("@/app/api/invoices/route");
    const req = createRequest("http://localhost/api/invoices", {
      method: "POST",
      body: { amount: "100" },
      headers: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/invoices", () => {
  beforeEach(() => {
    mockVerifyToken.mockResolvedValue({
      sub: "alien-1",
      exp: 0,
      iat: 0,
    });
  });

  it("returns intent when invoice exists", async () => {
    createPaymentIntent("inv-get-1", "alien-1", "50", "ALIEN", "alien", "rec");
    const { GET } = await import("@/app/api/invoices/route");
    const req = createAuthenticatedRequest(
      "http://localhost/api/invoices?invoice=inv-get-1"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.invoice).toBe("inv-get-1");
    expect(data.amount).toBe("50");
  });

  it("returns 400 when invoice param missing", async () => {
    const { GET } = await import("@/app/api/invoices/route");
    const req = createAuthenticatedRequest("http://localhost/api/invoices");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when invoice not found", async () => {
    const { GET } = await import("@/app/api/invoices/route");
    const req = createAuthenticatedRequest(
      "http://localhost/api/invoices?invoice=inv-nonexistent"
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns 401 when no auth", async () => {
    const { GET } = await import("@/app/api/invoices/route");
    const req = createRequest("http://localhost/api/invoices?invoice=inv-1", {
      headers: {},
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
