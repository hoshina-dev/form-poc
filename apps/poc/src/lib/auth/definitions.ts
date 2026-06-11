import { z } from "zod";

export const AppRole = z.enum(["client", "technician"]);
export type AppRole = z.infer<typeof AppRole>;

export interface SessionPayload {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  custapiRole?: string;
  organizationId?: string;
  appRole: AppRole;
  expiresAt: Date;
}

export interface SessionUser {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  appRole: AppRole;
}

export const LoginFormSchema = z.object({
  email: z.email({ message: "Please enter a valid email." }).trim(),
  password: z.string().min(1, { message: "Password is required." }).trim(),
  appRole: AppRole,
});

export type LoginFormState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
        appRole?: string[];
      };
      message?: string;
    }
  | undefined;
