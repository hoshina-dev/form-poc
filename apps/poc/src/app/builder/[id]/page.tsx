import { notFound } from "next/navigation";

import { BuilderApp } from "@/components/builder/BuilderApp";
import { listForms, readForm } from "@/lib/storage";

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

export async function generateStaticParams() {
  const forms = await listForms();
  return forms.map((f) => ({ id: f.id }));
}
