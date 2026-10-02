import { cookies } from "next/headers";

export const AUTH_COOKIE = "new_arif_session";
const SESSION_TTL = 12 * 60 * 60;

function secret() {
  const value = process.env.AUTH_SECRET;

  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_SECRET must be set and at least 32 characters long."
    );
  }

  return value;
}

function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlToBytes(value: string) {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sign(value: string) {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value)
  );

  return base64url(new Uint8Array(signature));
}

export async function createSession(
  username: string,
  role: "ADMIN" | "STAFF"
) {
  const payload = base64url(
    new TextEncoder().encode(
      JSON.stringify({
        u: username,
        r: role,
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL,
      })
    )
  );

  const signature = await sign(payload);

  return `${payload}.${signature}`;
}

export async function verifySession(token: string | undefined) {
  if (!token) return null;

  const [payload, signature] = token.split(".");

  if (!payload || !signature) return null;

  try {
    const expected = await sign(payload);

    if (signature !== expected) return null;

    const data = JSON.parse(
      new TextDecoder().decode(base64urlToBytes(payload))
    );

    if (
      !data?.u ||
      !data?.r ||
      !["ADMIN", "STAFF"].includes(data.r) ||
      data.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return data as {
      u: string;
      r: "ADMIN" | "STAFF";
      exp: number;
    };
  } catch {
    return null;
  }
}

export async function getSession() {
  return verifySession(
    (await cookies()).get(AUTH_COOKIE)?.value
  );
}

export type SessionRole = "ADMIN" | "STAFF";

export function hasRole(
  session: { r: SessionRole } | null,
  ...roles: SessionRole[]
) {
  return !!session && roles.includes(session.r);
}
