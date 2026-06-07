import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { SESSION_COOKIE } from "./constants";
import type { AppRole, SessionPayload, SessionUser } from "./definitions";
import { decrypt } from "./session";

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await decrypt(cookie);

  if (!session?.userId) {
    return null;
  }

  return session;
});

export function toSessionUser(session: SessionPayload): SessionUser {
  return {
    userId: session.userId,
    name: session.name,
    email: session.email,
    avatarUrl: session.avatarUrl,
    appRole: session.appRole,
  };
}

export async function requireSession(role?: AppRole): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (role && session.appRole !== role) {
    redirect(session.appRole === "technician" ? "/experiments" : "/");
  }
  return session;
}
