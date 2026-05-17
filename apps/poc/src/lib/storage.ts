import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { FormSchema } from "@hoshina-dev/forms";

const VALID_ID = /^[A-Za-z0-9_-]+$/;

export interface FormSummary {
  id: string;
  title: string;
  description?: string;
}

function dir(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "data", "forms");
}

async function ensureDir(): Promise<string> {
  const d = dir();
  await fs.mkdir(d, { recursive: true });
  return d;
}

function assertValidId(id: string): void {
  if (!VALID_ID.test(id)) {
    throw new InvalidFormIdError(id);
  }
}

function filePath(id: string): string {
  assertValidId(id);
  return path.join(dir(), `${id}.json`);
}

export async function listForms(): Promise<FormSummary[]> {
  const d = await ensureDir();
  const entries = await fs.readdir(d);
  const summaries: FormSummary[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(d, entry), "utf8");
      const parsed = FormSchema.parse(JSON.parse(raw));
      summaries.push({
        id: parsed.id,
        title: parsed.title,
        description: parsed.description,
      });
    } catch {
      // Skip unparseable files — they shouldn't exist, but don't crash the list.
    }
  }

  summaries.sort((a, b) => a.title.localeCompare(b.title));
  return summaries;
}

export async function readForm(id: string): Promise<FormSchema | null> {
  await ensureDir();
  try {
    const raw = await fs.readFile(filePath(id), "utf8");
    return FormSchema.parse(JSON.parse(raw));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export async function formExists(id: string): Promise<boolean> {
  await ensureDir();
  try {
    await fs.access(filePath(id));
    return true;
  } catch {
    return false;
  }
}

export async function writeForm(form: FormSchema): Promise<void> {
  await ensureDir();
  const validated = FormSchema.parse(form);
  await fs.writeFile(
    filePath(validated.id),
    JSON.stringify(validated, null, 2) + "\n",
    "utf8",
  );
}

export async function deleteForm(id: string): Promise<boolean> {
  await ensureDir();
  try {
    await fs.unlink(filePath(id));
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw e;
  }
}

export class InvalidFormIdError extends Error {
  constructor(id: string) {
    super(`Form id must match ${VALID_ID.source}, got "${id}"`);
    this.name = "InvalidFormIdError";
  }
}
