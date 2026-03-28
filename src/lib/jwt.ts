import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export interface JwtPayload {
  sub: string;
  [key: string]: NonNullable<unknown>;
}

export async function signAccessToken(payload: JwtPayload) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sub, ...rest } = payload;
  return new SignJWT({ ...rest })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}
