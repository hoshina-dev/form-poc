import { notFound } from "next/navigation";

import { BuilderApp } from "@/components/builder/BuilderApp";
import { readForm } from "@/lib/storage";

export const dynamic = "force-dynamic";

interface EditFormBuilderPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFormBuilderPage({
  params,
}: EditFormBuilderPageProps) {
  const { id } = await params;
  const form = await readForm(id);
  if (!form) {
    notFound();
  }
  return <BuilderApp initial={form} mode="edit" />;
}
