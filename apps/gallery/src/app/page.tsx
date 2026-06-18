import { readFileSync } from "node:fs";
import { join } from "node:path";

import { GALLERY } from "@hoshina-dev/forms";
import { Anchor, Code, Stack, Text, Title } from "@mantine/core";

const schemaText = readFileSync(
  join(process.cwd(), "../../packages/forms/experiment-template.schema.json"),
  "utf8",
);

const TEMPLATE_EXAMPLE = `{
  "clientForm": {
    "title": "Client intake",
    "questions": [
      {
        "id": "sample_id",
        "type": "string",
        "label": "Sample ID",
        "config": { "placeholder": "SMP-001" }
      }
    ]
  },
  "labForm": {
    "title": "Lab measurements",
    "questions": []
  },
  "calculations": {
    "average": {
      "formula": "mean(values['reading'])"
    }
  },
  "values": {
    "sample_id": "SMP-001"
  }
}`;

export default function GalleryIndexPage() {
  return (
    <Stack gap="xl" maw={860}>
      <Stack gap="md">
        <Title order={2}>Hoshina Form Gallery</Title>
        <Text c="dimmed">
          Every question type the form engine supports. Pick one from the
          sidebar to customize its JSON fields and see a live preview.
        </Text>
        <Text size="sm" c="dimmed">
          {GALLERY.length} components.
        </Text>
      </Stack>

      <Stack gap="sm">
        <Title order={3}>The experiment template</Title>
        <Text>
          An experiment template is the top-level document the form engine
          loads. It pairs two forms — <Code>clientForm</Code> and{" "}
          <Code>labForm</Code> — each a <Code>FormDoc</Code> with a{" "}
          <Code>title</Code>, optional <Code>description</Code>, and a{" "}
          <Code>questions</Code> array. Named <Code>calculations</Code> map
          variable names to objects with a Python <Code>formula</Code>{" "}
          (evaluated by the backend) and an optional computed{" "}
          <Code>result</Code>. Collected answers live in <Code>values</Code>,
          keyed by question id.
        </Text>
        <Code block>{TEMPLATE_EXAMPLE}</Code>
      </Stack>

      <Stack gap="sm">
        <Title order={3}>Repeatable group</Title>
        <Text>
          A repeatable group is a fixed-<Code>count</Code> repeating section —
          for example, &ldquo;measure the sample 8 times&rdquo;. It may include
          an optional <Code>itemLabel</Code> and a list of child{" "}
          <Code>questions</Code> in its <Code>config</Code>. Only one level of
          nesting is supported: a repeatable group cannot contain another
          repeatable group. Answers are stored columnar: each child question id
          maps to an array of length <Code>count</Code> (one entry per
          repetition).
        </Text>
        <Anchor href="/repeatable-group" size="sm">
          See the repeatable-group component →
        </Anchor>
      </Stack>

      <details>
        <summary>
          <Text component="span" fw={600}>
            Full JSON Schema
          </Text>
        </summary>
        <Code block mt="sm">
          {schemaText}
        </Code>
      </details>
    </Stack>
  );
}
