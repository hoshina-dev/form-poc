import { findGalleryEntry, GALLERY } from "@hoshina-dev/forms";
import {
  Badge,
  Code,
  Group,
  Paper,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  Title,
} from "@mantine/core";
import { notFound } from "next/navigation";
import { z } from "zod";

import { GalleryValueDisplay } from "@/components/GalleryValueDisplay";

type JsonSchemaObject = Record<string, unknown>;

const DISCRIMINATOR_FIELD = "type";

const FIELD_DESCRIPTIONS: Record<string, string> = {
  count: "Number of rating icons to display.",
  default: "Initial value used before the user changes the answer.",
  description: "Optional helper text shown under the question label.",
  format: "Color value format accepted by the color input.",
  fractions: "Fractional precision for rating values.",
  id: "Stable answer key used when storing or reading this value.",
  label: "Question text shown to the user.",
  marks: "Visible labels placed along a slider.",
  max: "Largest accepted value.",
  maxLength: "Maximum number of characters.",
  maxRows: "Maximum visible textarea rows.",
  maxTags: "Maximum number of tags the user can add.",
  maxValues: "Maximum number of choices the user can select.",
  min: "Smallest accepted value.",
  minLength: "Minimum number of characters.",
  minRows: "Minimum visible textarea rows.",
  options: "Choices available to the user.",
  placeholder: "Hint text shown before a value is entered.",
  required: "Whether the user must answer this question.",
  step: "Increment used by numeric controls.",
  suggestions: "Suggested tags offered while typing.",
  swatches: "Preset color choices shown by the color input.",
  type: "Discriminator field that chooses the question schema and renderer.",
};

interface PageProps {
  params: Promise<{ type: string }>;
}

export default async function GalleryDetailPage({ params }: PageProps) {
  const { type } = await params;
  const entry = findGalleryEntry(type);
  if (!entry) notFound();

  const jsonSchema = z.toJSONSchema(entry.zodSchema);

  return (
    <Stack gap="lg" maw={900}>
      <Stack gap={4}>
        <Group gap="sm" align="center">
          <Title order={2}>{entry.label}</Title>
          <Badge variant="light" color="grape" size="lg">
            {entry.type}
          </Badge>
        </Group>
        <Text c="dimmed">{entry.description}</Text>
      </Stack>

      <Paper withBorder p="md" radius="md">
        <Title order={4} mb="sm">
          Live preview
        </Title>
        <GalleryValueDisplay question={entry.example} />
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Title order={4} mb="sm">
          Example JSON
        </Title>
        <Code block>{JSON.stringify(entry.example, null, 2)}</Code>
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Title order={4} mb="sm">
          Schema fields
        </Title>
        <Text size="sm" c="dimmed" mb="xs">
          Generated from the Zod schema for this question type.
        </Text>
        <SchemaTable schema={jsonSchema} />
      </Paper>
    </Stack>
  );
}

export function generateStaticParams() {
  return GALLERY.map((entry) => ({ type: entry.type }));
}

function SchemaTable({ schema }: { schema: unknown }) {
  const schemaObject = asSchemaObject(schema);
  const properties = asSchemaObject(schemaObject?.properties);
  const required = new Set(
    Array.isArray(schemaObject?.required)
      ? schemaObject.required.filter((item) => typeof item === "string")
      : [],
  );

  if (!properties) {
    return (
      <Text size="sm" c="dimmed">
        No field information is available for this schema.
      </Text>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <Table highlightOnHover verticalSpacing="sm">
        <TableThead>
          <TableTr>
            <TableTh>Field</TableTh>
            <TableTh>Type</TableTh>
            <TableTh>Required</TableTh>
            <TableTh>Meaning</TableTh>
            <TableTh>Details</TableTh>
          </TableTr>
        </TableThead>
        <TableTbody>
          {Object.entries(properties).map(([name, property]) => {
            const propertyObject = asSchemaObject(property);
            const isDiscriminator = name === DISCRIMINATOR_FIELD;

            return (
              <TableTr
                key={name}
                style={
                  isDiscriminator
                    ? { background: "var(--mantine-color-grape-0)" }
                    : undefined
                }
              >
                <TableTd>
                  <Group gap="xs">
                    <Code>{name}</Code>
                    {isDiscriminator ? (
                      <Badge color="grape" variant="filled" size="sm">
                        Discriminator
                      </Badge>
                    ) : null}
                  </Group>
                </TableTd>
                <TableTd>{describeType(propertyObject)}</TableTd>
                <TableTd>
                  <Badge
                    color={required.has(name) ? "green" : "gray"}
                    variant="light"
                  >
                    {required.has(name) ? "Yes" : "No"}
                  </Badge>
                </TableTd>
                <TableTd>
                  <Text size="sm">
                    {FIELD_DESCRIPTIONS[name] ?? "Additional configuration."}
                  </Text>
                </TableTd>
                <TableTd>
                  <Text size="sm" c="dimmed">
                    {describeDetails(name, propertyObject)}
                  </Text>
                </TableTd>
              </TableTr>
            );
          })}
        </TableTbody>
      </Table>
    </div>
  );
}

function asSchemaObject(value: unknown): JsonSchemaObject | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as JsonSchemaObject;
}

function describeType(schema: JsonSchemaObject | undefined): string {
  if (!schema) return "Unknown";

  if ("const" in schema) {
    return "Fixed value";
  }

  if (Array.isArray(schema.enum)) {
    return "One of";
  }

  const type = normalizeType(schema.type);

  if (type === "array") {
    return `Array of ${describeArrayItemType(schema.items)}`;
  }

  if (type) return titleCase(type);
  if (schema.properties) return "Object";

  return "Any";
}

function describeArrayItemType(items: unknown): string {
  const itemSchema = asSchemaObject(items);
  if (!itemSchema) return "values";

  if (itemSchema.properties) return "objects";

  const type = normalizeType(itemSchema.type);
  if (!type) return "values";

  return `${type}s`;
}

function describeDetails(
  fieldName: string,
  schema: JsonSchemaObject | undefined,
): string {
  if (!schema) return "No additional rules.";

  const details: string[] = [];

  if ("const" in schema) {
    if (fieldName === DISCRIMINATOR_FIELD) {
      details.push(
        `Must be ${formatValue(schema.const)}. This constant value selects this question variant in the JSON union.`,
      );
    } else {
      details.push(`Must be ${formatValue(schema.const)}.`);
    }
  }

  if (Array.isArray(schema.enum)) {
    details.push(`Allowed values: ${schema.enum.map(formatValue).join(", ")}.`);
  }

  const itemDetails = describeArrayItems(schema.items);
  if (itemDetails) {
    details.push(itemDetails);
  }

  return details.join(" ") || "No additional rules.";
}

function describeArrayItems(items: unknown): string | undefined {
  const itemSchema = asSchemaObject(items);
  const itemProperties = asSchemaObject(itemSchema?.properties);
  if (!itemProperties) return undefined;

  const fields = Object.entries(itemProperties).map(([name, property]) => {
    const type = describeType(asSchemaObject(property)).toLowerCase();
    return `${name} (${type})`;
  });

  return `Each item includes ${fields.join(", ")}.`;
}

function normalizeType(type: unknown): string | undefined {
  if (typeof type === "string") return type;

  if (Array.isArray(type)) {
    const nonNullType = type.find(
      (item): item is string => typeof item === "string" && item !== "null",
    );
    return nonNullType;
  }

  return undefined;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  return JSON.stringify(value) ?? String(value);
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
