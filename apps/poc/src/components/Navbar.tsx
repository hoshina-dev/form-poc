import { getSession, toSessionUser } from "@/lib/auth/dal";

import { NavbarClient } from "./NavbarClient";

export async function Navbar() {
  const session = await getSession();
  return <NavbarClient session={session ? toSessionUser(session) : null} />;
}
