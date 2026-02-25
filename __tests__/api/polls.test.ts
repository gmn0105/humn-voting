import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedRequest, createRequest } from "@/__tests__/utils/request";
import { createMockSupabase } from "@/__tests__/utils/supabase-mock";
import { mockPollRow } from "@/__tests__/utils/test-poll";

const { mockVerifyToken } = vi.hoisted(() => ({ mockVerifyToken: vi.fn() }));
const mockSupabaseRef = vi.hoisted(() => ({ current: null as any }));

vi.mock("@alien_org/auth-client", () => ({
  createAuthClient: () => ({ verifyToken: mockVerifyToken }),
  JwtErrors: {},
}));
vi.mock("@/lib/supabase", () => ({
  getSupabase: () => mockSupabaseRef.current!.client,
}));

function getMockSupabase() {
  if (!mockSupabaseRef.current) mockSupabaseRef.current = createMockSupabase();
  return mockSupabaseRef.current;
}

describe("GET /api/polls", () => {
  beforeEach(() => {
    getMockSupabase().clear();
    mockVerifyToken.mockResolvedValue({
      sub: "test-alien",
      exp: 0,
      iat: 0,
    });
  });

  it("returns 401 for assigned tab without auth", async () => {
    const { GET } = await import("@/app/api/polls/route");
    const req = createRequest("http://localhost/api/polls?tab=assigned", {
      headers: {},
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 for created tab without auth", async () => {
    const { GET } = await import("@/app/api/polls/route");
    const req = createRequest("http://localhost/api/polls?tab=created", {
      headers: {},
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid tab", async () => {
    const { GET } = await import("@/app/api/polls/route");
    const req = createAuthenticatedRequest(
      "http://localhost/api/polls?tab=invalid"
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns empty array for assigned when no audience rows", async () => {
    getMockSupabase().pushSelect({ data: [], error: null });
    const { GET } = await import("@/app/api/polls/route");
    const req = createAuthenticatedRequest(
      "http://localhost/api/polls?tab=assigned"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("returns polls for created tab", async () => {
    const poll = mockPollRow({ id: "p1", creator_alien_id: "test-alien" });
    const mock = getMockSupabase();
    mock.pushSelect({ data: [poll], error: null });
    mock.pushSelect({ data: [{ poll_id: "p1" }], error: null });
    mock.pushSelect({ data: [], error: null });
    const { GET } = await import("@/app/api/polls/route");
    const req = createAuthenticatedRequest(
      "http://localhost/api/polls?tab=created"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0].id).toBe("p1");
  });

  it("returns closed polls for completed tab without auth", async () => {
    const poll = mockPollRow({
      id: "p1",
      status: "closed",
      creator_alien_id: "other",
    });
    const mock = getMockSupabase();
    mock.pushSelect({ data: [poll], error: null });
    mock.pushSelect({ data: [], error: null });
    mock.pushSelect({ data: [], error: null });
    const { GET } = await import("@/app/api/polls/route");
    const req = createRequest("http://localhost/api/polls?tab=completed", {
      headers: {},
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].status).toBe("closed");
  });
});

describe("POST /api/polls", () => {
  beforeEach(() => {
    getMockSupabase().clear();
    mockVerifyToken.mockResolvedValue({
      sub: "creator-alien",
      exp: 0,
      iat: 0,
    });
  });

  it("returns 400 when title missing", async () => {
    const { POST } = await import("@/app/api/polls/route");
    const req = createAuthenticatedRequest("http://localhost/api/polls", {
      method: "POST",
      body: { options: ["A", "B"], audience_type: "public" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Title");
  });

  it("returns 400 when fewer than two options", async () => {
    const { POST } = await import("@/app/api/polls/route");
    const req = createAuthenticatedRequest("http://localhost/api/polls", {
      method: "POST",
      body: {
        title: "Poll",
        options: ["A"],
        audience_type: "public",
        result_visibility_mode: "after_poll_closes",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for capital poll when option missing amount", async () => {
    const { POST } = await import("@/app/api/polls/route");
    const req = createAuthenticatedRequest("http://localhost/api/polls", {
      method: "POST",
      body: {
        title: "Capital Poll",
        type: "capital",
        options: [
          { text: "A", recipient_wallet: "addr1", amount: 10 },
          { text: "B", recipient_wallet: "addr2" },
        ],
        audience_type: "public",
        result_visibility_mode: "after_poll_closes",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Capital");
  });

  it("returns 400 for targeted without audience_ids", async () => {
    const { POST } = await import("@/app/api/polls/route");
    const req = createAuthenticatedRequest("http://localhost/api/polls", {
      method: "POST",
      body: {
        title: "Poll",
        options: ["A", "B"],
        audience_type: "targeted",
        result_visibility_mode: "after_poll_closes",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("audience");
  });

  it("returns 400 when end_time is in the past", async () => {
    const { POST } = await import("@/app/api/polls/route");
    const req = createAuthenticatedRequest("http://localhost/api/polls", {
      method: "POST",
      body: {
        title: "Poll",
        options: ["A", "B"],
        audience_type: "public",
        result_visibility_mode: "after_poll_closes",
        end_time: "2020-01-01T00:00:00.000Z",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("future");
  });

  it("creates standard poll and returns poll", async () => {
    const created = mockPollRow({
      id: "new-poll-id",
      title: "New Poll",
      creator_alien_id: "creator-alien",
    });
    const mock = getMockSupabase();
    mock.pushInsert({ data: created, error: null });
    mock.pushInsert({ data: null, error: null });
    const { POST } = await import("@/app/api/polls/route");
    const req = createAuthenticatedRequest("http://localhost/api/polls", {
      method: "POST",
      body: {
        title: "New Poll",
        description: "Desc",
        type: "standard",
        options: ["Option A", "Option B"],
        audience_type: "public",
        result_visibility_mode: "after_poll_closes",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("New Poll");
    expect(data.id).toBeDefined();
  });
});
