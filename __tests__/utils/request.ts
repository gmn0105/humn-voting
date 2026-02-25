/**
 * Build a Request for API route handlers.
 */
export function createRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): Request {
  const { method = "GET", headers = {}, body } = options;
  const init: RequestInit = {
    method,
    headers: new Headers(headers),
  };
  if (body !== undefined && method !== "GET") {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
    if (!init.headers.has("Content-Type")) {
      (init.headers as Headers).set("Content-Type", "application/json");
    }
  }
  return new Request(url, init);
}

export function createAuthenticatedRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    token?: string;
  } = {}
): Request {
  const token = options.token ?? "test-token";
  return createRequest(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}
