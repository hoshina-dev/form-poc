import { NextResponse } from "next/server";

import { FormSchema } from "@/lib/schema";
import {
  InvalidFormIdError,
  deleteForm,
  readForm,
  writeForm,
} from "@/lib/storage";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const form = await readForm(id);
    if (!form) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(form);
  } catch (e) {
    if (e instanceof InvalidFormIdError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

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

  if (result.data.id !== id) {
    return NextResponse.json(
      { error: `Body id "${result.data.id}" does not match URL id "${id}"` },
      { status: 400 },
    );
  }

  try {
    await writeForm(result.data);
  } catch (e) {
    if (e instanceof InvalidFormIdError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  return NextResponse.json({ id });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const removed = await deleteForm(id);
    if (!removed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ id });
  } catch (e) {
    if (e instanceof InvalidFormIdError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
