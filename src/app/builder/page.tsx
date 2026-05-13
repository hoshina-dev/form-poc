import { BuilderApp } from "@/components/builder/BuilderApp";
import { emptyForm } from "@/lib/builder";

export default function NewFormBuilderPage() {
  return <BuilderApp initial={emptyForm()} mode="create" />;
}
