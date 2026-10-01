'use client';
import { ui } from '../../lib/ui';
import { useEditor } from './EditorContext';
import Icon from '../Icon';
import ContextMenu from '../ContextMenu';

import { Field, Button, Input, Select } from '../ui';
import { embedImage } from '../../lib/images';
import { download } from '../../lib/lilt';

import AppDialog from '../ui/AppDialog';
import CodeEditor from '../ui/CodeEditor';
import VideoExportPanel from './VideoExportPanel';
import { shortcutHelp } from '../../hooks/useEditorShortcuts';
export default function EditorOverlays() {
  const { addMarker, selectedMarker, setMarkerDialogOpen, deleteMarker } = useEditor();
  const {
    engine,
    score,
    time,
    status,
    setStatus,
    modal,
    setModal,
    jsonDraft,
    setJsonDraft,
    packSource,
    setPackSource,
    packName,
    setPackName,
    packSources,
    setPackSources,
    relayURL,
    setRelayURL,
    relayConnected,
    restore,
    setRestore,
    jsonTarget,
    codeError,
    setCodeError,
    context,
    closeContext,
    importInput,
    audioInput,
    imageInput,
    pause,
    seek,
    removeClip,
    duplicateClip,
    addVisual,
    effects,
    applyProject,
    exportScore,
    exportHTML,
    snapshot,
    connectRelay,
    installPack,
    loadAudio,
    loopClip,
    markRegion,
    navigateClip,
    openJSON,
    applyCode,
  } = useEditor();
  return (
    <>
      <Input
        ref={importInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (e) => {
          try {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 8_000_000) throw Error('Score exceeds 8 MB including images.');
            applyProject(JSON.parse(await f.text()));
          } catch (error) {
            setStatus((error as Error).message);
          }
          e.target.value = '';
        }}
      />
      <Input
        ref={imageInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try {
            setStatus('Embedding image…');
            const asset = await embedImage(file);
            addVisual('image', asset);
          } catch (error) {
            setStatus((error as Error).message);
          }
        }}
      />
      <Input
        ref={audioInput}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void loadAudio(f);
          e.target.value = '';
        }}
      />
      {restore && (
        <div className={ui('restore-banner')}>
          <Icon name="save" />
          <span>
            A saved project uses custom JavaScript. Restore it only if you trust its code.
          </span>
          <Button
            onClick={() => {
              try {
                const definitions = Object.fromEntries(
                  Object.entries(restore.packSources).map(([id, text]) => [
                    id,
                    new Function(`"use strict";return (${text}\n)`)(),
                  ]),
                );
                engine.registerPack({ id: 'user', version: '1.0.0', effects: definitions });
                engine.validate(restore.score);
                setPackSources(restore.packSources);
                applyProject(restore.score);
                setRestore(null);
              } catch (error) {
                setStatus((error as Error).message);
              }
            }}
          >
            Restore & run trusted code
          </Button>
          <Button icon="close" title="Dismiss saved project" onClick={() => setRestore(null)} />
        </div>
      )}
      {context && (
        <ContextMenu
          x={context.x}
          y={context.y}
          onClose={closeContext}
          items={[
            {
              label: 'Seek here',
              action: () => {
                pause();
                seek(context.time);
              },
            },
            {
              label: 'Add marker here',
              action: () => {
                seek(context.time);
                addMarker();
              },
            },
            ...(selectedMarker
              ? [
                  { label: 'Edit marker', action: () => setMarkerDialogOpen(true) },
                  { label: 'Delete marker', action: deleteMarker },
                ]
              : []),
            { label: 'Previous clip', action: () => navigateClip(-1) },
            { label: 'Next clip', action: () => navigateClip(1) },
            { label: 'Set loop start here', action: () => markRegion('start', context.time) },
            { label: 'Set loop end here', action: () => markRegion('end', context.time) },
            ...(context.clipId
              ? [
                  { label: 'Loop this clip', action: loopClip },
                  { label: 'Edit clip code', action: () => openJSON('clip') },
                  { label: 'Duplicate clip', action: duplicateClip },
                  { label: 'Delete clip', action: removeClip, disabled: score.scenes.length < 2 },
                ]
              : []),
          ]}
        />
      )}
      {modal && (
        <AppDialog
          open
          title={
            modal === 'code'
              ? 'Write your own motion.'
              : modal === 'json'
                ? 'The score behind the scene.'
                : modal === 'help'
                  ? 'Keyboard shortcuts'
                  : 'Export composition'
          }
          wide={modal === 'json' || modal === 'code'}
          onClose={() => setModal(null)}
        >
          <div className={ui('modal-heading')}>
            <div>
              <span className={ui('eyebrow')}>LILT STUDIO</span>
              <h2 id="modal-title">
                {
                  {
                    export: 'Out into the world.',
                    code: 'Write your own motion.',
                    json: 'The score behind the scene.',
                    help: 'A little help, a lot of possibility.',
                  }[modal]
                }
              </h2>
            </div>
            <Button icon="close" title="Close dialog" onClick={() => setModal(null)} />
          </div>

          {codeError && (modal === 'code' || modal === 'json') && (
            <p className={ui('code-error')} role="alert">
              {codeError}
            </p>
          )}

          {modal === 'export' && (
            <>
              <p className={ui('modal-description')}>
                Your composition, ready for a browser, a stream, or another project.
              </p>
              <VideoExportPanel />
              <button className={ui('export-option')} onClick={() => void exportHTML()}>
                <span className={ui('export-icon')}>
                  <Icon name="film" size={24} />
                </span>
                <span>
                  <strong>Standalone player</strong>
                  <small>
                    A single HTML file. Renderer, fonts, score, and custom effects included.
                  </small>
                </span>
                <Icon name="download" />
              </button>
              <button className={ui('export-option')} onClick={exportScore}>
                <span className={ui('export-icon')}>
                  <Icon name="code" size={24} />
                </span>
                <span>
                  <strong>Score JSON</strong>
                  <small>Lightweight animation data. Keep code and fonts separate.</small>
                </span>
                <Icon name="download" />
              </button>
              <button className={ui('export-option')} onClick={snapshot}>
                <span className={ui('export-icon')}>
                  <Icon name="frame" size={24} />
                </span>
                <span>
                  <strong>Current frame</strong>
                  <small>PNG from the preview canvas, without editor guides.</small>
                </span>
                <Icon name="download" />
              </button>
              {Object.keys(packSources).length > 0 && (
                <button
                  className={ui('export-option')}
                  onClick={() =>
                    download(
                      `Lilt3.registerPack({id:'user',version:'1.0.0',effects:{${Object.entries(
                        packSources,
                      )
                        .map(([id, src]) => `${JSON.stringify(id)}:(${src})`)
                        .join(',')}});`,
                      'lilt-user-pack.js',
                      'text/javascript',
                    )
                  }
                >
                  <span className={ui('export-icon')}>
                    <Icon name="spark" size={24} />
                  </span>
                  <span>
                    <strong>Custom effect pack</strong>
                    <small>Reusable vanilla JavaScript definitions.</small>
                  </span>
                  <Icon name="download" />
                </button>
              )}
              <div className={ui('obs-note')}>
                <Icon name="eye" />
                <div>
                  <strong>Made for OBS Browser Sources</strong>
                  <p>
                    Export the player, enable “Local file” in OBS, and select the HTML. Match the
                    source size to {score.stage!.width} × {score.stage!.height}. The player is
                    transparent by default. Audio is separate.
                  </p>
                  <code>
                    {typeof location !== 'undefined' ? location.origin : ''}
                    /player.html?transparent=1
                  </code>
                  <p>
                    Run <code>npm run relay</code>, connect below, then use this OBS URL:{' '}
                    <code>
                      {typeof location !== 'undefined' ? location.origin : ''}
                      /player.html?autoplay=0&amp;socket={encodeURIComponent(relayURL)}
                    </code>
                    . A standalone HTML player accepts the same <code>?socket=</code> parameter.
                  </p>
                  <div className={ui('relay-controls')}>
                    <Input
                      aria-label="WebSocket relay URL"
                      value={relayURL}
                      onChange={(e) => setRelayURL(e.target.value)}
                      placeholder="ws://127.0.0.1:8787"
                    />
                    <Button icon={relayConnected ? 'check' : 'bolt'} onClick={connectRelay}>
                      {relayConnected ? 'Disconnect' : 'Connect relay'}
                    </Button>
                  </div>
                  <p>
                    “Sync local player” controls same-origin tabs in this browser. The relay
                    connects the studio to OBS on this computer.
                  </p>
                </div>
              </div>
            </>
          )}

          {modal === 'json' && (
            <>
              <div className={ui('code-tabs')}>
                <Button
                  className={ui(jsonTarget === 'project' ? 'active' : '')}
                  onClick={() => openJSON()}
                >
                  Project JSON
                </Button>
                <Button
                  className={ui(jsonTarget === 'clip' ? 'active' : '')}
                  onClick={() => openJSON('clip')}
                >
                  Clip JSON
                </Button>
                <Button
                  onClick={() => {
                    setCodeError('');
                    if (packSources[packName]) setPackSource(packSources[packName]);
                    else if (!packSource)
                      setPackSource(
                        '{kind: "motion", phase: "enter", duration: 1200, sample({e}) { return {y:120*(1-e),opacity:e}; }}',
                      );
                    setModal('code');
                  }}
                >
                  Effect JavaScript
                </Button>
              </div>
              <p className={ui('modal-description')}>
                Version 3 scores stay compatible. Keyframes and stage settings extend the format.
              </p>
              <CodeEditor
                value={jsonDraft}
                onChange={setJsonDraft}
                language="json"
                label={
                  jsonTarget === 'project'
                    ? 'Score JSON'
                    : jsonTarget === 'clip'
                      ? 'Clip JSON'
                      : 'Effect JSON'
                }
              />
              <div className={ui('modal-actions')}>
                <Button icon="download" onClick={exportScore}>
                  Export JSON
                </Button>
                <Button icon="check" className={ui('primary')} onClick={applyCode}>
                  Validate & apply
                </Button>
              </div>
            </>
          )}

          {modal === 'code' && (
            <>
              <div className={ui('code-tabs')}>
                <Button onClick={() => openJSON()}>Project JSON</Button>
                <Button onClick={() => openJSON('clip')}>Clip JSON</Button>
                <Button className={ui('active')}>Effect JavaScript</Button>
              </div>
              {Object.keys(packSources).length > 0 && (
                <Field label="Saved effect">
                  <Select
                    aria-label="Saved effect"
                    value={Object.hasOwn(packSources, packName) ? packName : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setPackName(e.target.value);
                        setPackSource(packSources[e.target.value]);
                        setCodeError('');
                      }
                    }}
                  >
                    <option value="">New effect…</option>
                    {Object.keys(packSources).map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </Select>
                </Field>
              )}
              <p className={ui('modal-description')}>
                Custom templates use the same registry as the built-in effects. This runs trusted
                JavaScript only when you click Register.
              </p>
              <Field label="Template name">
                <Input value={packName} onChange={(e) => setPackName(e.target.value)} />
              </Field>
              <CodeEditor
                value={packSource}
                onChange={setPackSource}
                language="javascript"
                label={'Custom effect JavaScript'}
              />
              <div className={ui('modal-actions')}>
                <span className={ui('hint')}>
                  Expose numeric parameters with <code>controls</code>.
                </span>
                <Button
                  icon="bolt"
                  className={ui('primary')}
                  onClick={() => {
                    setCodeError('');
                    installPack();
                  }}
                >
                  Register trusted code
                </Button>
              </div>
            </>
          )}

          {modal === 'help' && (
            <>
              <p className={ui('modal-description')}>
                Start with a clip, find its rhythm, and make every character feel intentional.
              </p>
              <div className={ui('shortcut-list')}>
                {shortcutHelp.map(([key, action]) => (
                  <div key={key}>
                    <span>{action}</span>
                    <kbd>{key}</kbd>
                  </div>
                ))}
              </div>
              <p className={ui('hint')}>
                The supplied Japanese lyrics have illustrative timing, not timing aligned to a
                recording. Embedded fonts cover the supplied glyphs; other characters use system
                fallback. Audio stays local and can be included in video exports.
              </p>
              <a className={ui('docs-link')} href="/lilt/SOURCE-README.md" target="_blank">
                Original model & pack documentation <Icon name="arrow" />
              </a>
            </>
          )}

          <div className={ui('modal-status')} role="status">
            {status}
          </div>
        </AppDialog>
      )}
    </>
  );
}
