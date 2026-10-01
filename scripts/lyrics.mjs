// File authoring CLI for environments without an MCP client. JSON arguments on stdin.
import { ProjectStore } from './mcp/projects.mjs';
const store = new ProjectStore(process.env.LILT_PROJECT_DIR || process.cwd());
const [action, project] = process.argv.slice(2);
try {
  if (!['list', 'read', 'preview', 'edit', 'create'].includes(action))
    throw Error('Use list, read, preview, edit or create.');
  if (action === 'list') console.log(JSON.stringify(await store.list(), null, 2));
  else if (action === 'read') console.log(JSON.stringify(await store.get(project), null, 2));
  else {
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    const args = JSON.parse(input);
    const value =
      action === 'preview'
        ? await store.preview(project, args.expectedRevision, args.edits)
        : action === 'edit'
          ? await store.update(project, args.expectedRevision, args.edits)
          : action === 'create'
            ? await store.create(project, args.name, args.cues)
            : (() => {
                throw Error('Use list, read, preview, edit or create.');
              })();
    console.log(JSON.stringify(value, null, 2));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
