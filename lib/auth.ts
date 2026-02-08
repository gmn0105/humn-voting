import { createAuthClient, JwtErrors } from "@alien_org/auth-client";

const authClient = createAuthClient();

export interface VerifiedUser {
  alienId: string;
  exp: number;
  iat: number;
}

/**
 * Extract Bearer token from Authorization header and verify with Alien JWKS.
 * Returns the verified token claims (sub = Alien ID) or throws.
 */
export async function verifyRequest(req: Request): Promise<VerifiedUser> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    throw new Error("Missing authorization token");
  }

  const tokenInfo = await authClient.verifyToken(token);
  return {
    alienId: tokenInfo.sub,
    exp: tokenInfo.exp,
    iat: tokenInfo.iat,
  };
}

export { JwtErrors };
