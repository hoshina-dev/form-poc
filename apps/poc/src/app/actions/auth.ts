"use server";

import { compare } from "bcryptjs";
import { redirect } from "next/navigation";

import { LoginFormSchema, type LoginFormState } from "@/lib/auth/definitions";
import { createSession, deleteSession } from "@/lib/auth/session";
import { usersApi } from "@/lib/custapi/client";

async function resolveOrganizationId(
  userId: string,
): Promise<string | undefined> {
  try {
    const memberships = await usersApi.usersIdIdOrganizationsGet(userId);
    return memberships.find((m) => m.organizationId)?.organizationId;
  } catch {
    return undefined;
  }
}

export async function login(
  _state: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const validatedFields = LoginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    appRole: formData.get("appRole"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password, appRole } = validatedFields.data;

  let user;
  try {
    user = await usersApi.usersEmailEmailGet(email);
  } catch {
    return { message: "Invalid email or password." };
  }

  const passwordMatch = await compare(password, user.password);
  if (!passwordMatch) {
    return { message: "Invalid email or password." };
  }

  await createSession({
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    custapiRole: user.role,
    organizationId: await resolveOrganizationId(user.id),
    appRole,
  });

  redirect(appRole === "technician" ? "/experiments" : "/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
