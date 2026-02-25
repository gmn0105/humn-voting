import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest } from "@/__tests__/utils/request";

const mockGenerateContent = vi.fn();
vi.mock("@/lib/gemini", () => ({
  getGemini: () => ({
    models: {
      generateContent: (opts: unknown) => mockGenerateContent(opts),
    },
  }),
}));

describe("POST /api/summary", () => {
  beforeEach(() => {
    mockGenerateContent.mockResolvedValue({ text: "Summarized proposal." });
  });

  it("returns summary from Gemini", async () => {
    const { POST } = await import("@/app/api/summary/route");
    const req = createRequest("http://localhost/api/summary", {
      method: "POST",
      body: { title: "Proposal", description: "Details" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summary).toBe("Summarized proposal.");
  });
});
