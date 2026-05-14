import { NextResponse } from "next/server";

import { FormSchema } from "@/lib/schema";
import {
  formExists,
  InvalidFormIdError,
  listForms,
  writeForm,
} from "@/lib/storage";

export async function GET() {
  const forms = await listForms();
  return NextResponse.json({ forms });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = FormSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Schema validation failed", issues: result.error.issues },
      { status: 400 },
    );
  }

  try {
    if (await formExists(result.data.id)) {
      return NextResponse.json(
        { error: `Form with id "${result.data.id}" already exists` },
        { status: 409 },
      );
    }
    await writeForm(result.data);
  } catch (e) {
    if (e instanceof InvalidFormIdError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  return NextResponse.json({ id: result.data.id }, { status: 201 });
}
