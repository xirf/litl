# Lilt lyric authoring MCP

A local stdio MCP server built with the official Model Context Protocol SDK.
It edits exported Lilt JSON files. It does not have access to browser local storage.
Open the edited JSON using Studio's **File → Open JSON…**. Browser changes are not
synchronized automatically, and OBS playback still uses the existing relay.

## Connect

1. Clone the repository and run `npm ci` (Node 22+).
2. Create a folder for lyric projects. Save Studio's **File → Save as JSON…** exports there.
3. Copy `mcp.config.example.json` into your MCP client's configuration, replacing both
   placeholder paths with absolute paths on the machine running the MCP client.
4. Restart/connect that client. Ask it to list projects, read a project's lyrics,
   preview the changes, then update the lyrics after reviewing the preview.

For an MCP client launched in this workspace, use `/workspace/litl/scripts/mcp/server.mjs`.
Set `LILT_PROJECT_DIR` to an existing directory. Use `node` directly rather than
`npm run mcp` in client configurations so npm's status output does not enter stdio.
The server writes only MCP protocol messages to stdout.

## Tools

| Tool                   | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `list_projects`        | List JSON files in the project directory.                      |
| `get_lyrics`           | Read text, clip IDs, timing and current revision.              |
| `read_project`         | Read the complete score including style/effects.               |
| `preview_lyric_edits`  | Validate edits and show before/after without writing.          |
| `update_lyrics`        | Apply a batch of text/name/start/duration edits with a backup. |
| `create_lyric_project` | Create a transparent composition from timed lyric cues.        |

Times are milliseconds. Use IDs from `get_lyrics`; pass its `revision` as
`expectedRevision` to preview/update. Each batch contains at most one edit per clip.
Unchanged characters retain their IDs and style/effect assignments. Changing a
clip duration scales its vocal timing anchors, matching Studio's duration control.
Rendered shape/image clips cannot be edited as text. Names and timing can be changed.

The model limits each line to 150 graphemes, each clip to 1–60000 ms, projects to
100 clips and 15 minutes. Larger songs can use several projects. Custom pack source
is preserved but never executed. Validation of custom JavaScript is deferred to
Studio's explicit trust flow; the tool reports when a custom pack is present.

Writes use a temporary file and atomic rename, reject changed revisions, and keep
original files under `.lilt-backups`. Reopen a backup JSON to restore it. New-project
creation never overwrites existing files. Files and symlinks must stay inside the
configured project directory. Do not place secrets in that directory.

## CLI fallback

The same implementation is available without an MCP connection:

```sh
LILT_PROJECT_DIR=/absolute/path/lyric-projects node scripts/lyrics.mjs list
LILT_PROJECT_DIR=/absolute/path/lyric-projects node scripts/lyrics.mjs read song.json
LILT_PROJECT_DIR=/absolute/path/lyric-projects node scripts/lyrics.mjs preview song.json < edits.json
LILT_PROJECT_DIR=/absolute/path/lyric-projects node scripts/lyrics.mjs edit song.json < edits.json
```

Example `edits.json` (replace the revision with the one returned by `read`):

```json
{
  "expectedRevision": "CURRENT_SHA256_REVISION",
  "edits": [{ "clipId": "line-1", "text": "Updated lyrics", "start": 1200, "duration": 2400 }]
}
```

Create from timed lines:

```sh
LILT_PROJECT_DIR=/absolute/path/lyric-projects node scripts/lyrics.mjs create new-song.json < cues.json
```

```json
{
  "name": "New song",
  "cues": [
    { "text": "First line", "start": 0, "end": 3000 },
    { "text": "Second line", "start": 3000, "end": 6000 }
  ]
}
```

An assistant can produce cues from an LRC/SRT transcript or supplied lyrics and
then create the project. Audio/video transcription itself is not performed by this server.
