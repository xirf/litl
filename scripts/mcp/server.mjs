import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ProjectStore, editsSchema, cuesSchema } from './projects.mjs';
const root = process.env.LILT_PROJECT_DIR;
if (!root)
  throw Error('Set LILT_PROJECT_DIR to the directory containing exported Lilt JSON projects.');
const store = new ProjectStore(root),
  server = new McpServer({ name: 'litl-lyrics', version: '1.0.0' });
const result = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] });
function tool(name, description, schema, action, readOnly = true) {
  server.registerTool(
    name,
    {
      description,
      inputSchema: schema,
      annotations: {
        readOnlyHint: readOnly,
        destructiveHint: !readOnly,
        idempotentHint: readOnly,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        return result(await action(args));
      } catch (error) {
        return { ...result({ error: error.message }), isError: true };
      }
    },
  );
}
tool('list_projects', 'List exported JSON project paths inside the configured directory.', {}, () =>
  store.list(),
);
tool(
  'get_lyrics',
  'Read text, clip IDs, placement, duration and the revision required for editing. Times are milliseconds.',
  { project: z.string() },
  (a) => store.get(a.project),
);
tool(
  'read_project',
  'Read the full project score, including style, animation, assets and marker data. Never executes custom JavaScript.',
  { project: z.string() },
  async (a) => {
    const p = await store.read(a.project);
    return { revision: p.revision, score: p.score };
  },
);
const editArgs = {
  project: z.string(),
  expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
  edits: editsSchema,
};
tool(
  'preview_lyric_edits',
  'Validate a batch and show before/after changes without writing. Text reconciliation preserves matched character IDs and effects.',
  editArgs,
  (a) => store.preview(a.project, a.expectedRevision, a.edits),
);
tool(
  'update_lyrics',
  'Apply a validated batch of text/name/start/duration edits. Requires the current revision; saves atomically and makes a backup. Reopen the JSON in Studio to see changes.',
  editArgs,
  (a) => store.update(a.project, a.expectedRevision, a.edits),
  false,
);
tool(
  'create_lyric_project',
  'Create a new transparent lyric project from timestamped text cues. Start/end are milliseconds. Never overwrites an existing file.',
  { project: z.string(), name: z.string().min(1).max(120), cues: cuesSchema },
  (a) => store.create(a.project, a.name, a.cues),
  false,
);
await server.connect(new StdioServerTransport());
