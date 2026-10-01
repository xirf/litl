'use client';
import { ui } from '../../lib/ui';
import { useEditor } from './EditorContext';
import Icon from '../Icon';
import EditorMenus from './EditorMenus';

import { Button, Input } from '../ui';

export default function EditorHeader() {
  const { setCommandOpen, newProject } = useEditor();
  const {
    current,
    historyCount,
    saveStatus,
    setModal,
    projectName,
    setProjectName,
    importInput,
    commit,
    undo,
    openJSON,
  } = useEditor();
  return (
    <header className={ui('studio-header')}>
      <a className={ui('studio-brand')} href="/" aria-label="Lilt home">
        <span className={ui('logo-mark')}>
          li<span>lt</span>
          <i />
        </span>
        <span className={ui('brand-divider')} />
        <span>studio</span>
      </a>
      <EditorMenus />
      <div className={ui('project-title')}>
        <span className={ui('project-dot')} />
        <Input
          aria-label="Project name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          onBlur={() =>
            commit((s) => {
              s.name = projectName || 'Untitled composition';
            }, 'Project renamed')
          }
        />
        <span className={ui('saved')}>
          <Icon name="check" size={12} />
          {saveStatus}
        </span>
      </div>
      <div className={ui('header-actions')}>
        <Button
          icon="search"
          title="Search actions (⌘/Ctrl K)"
          onClick={() => setCommandOpen(true)}
        />
        <Button icon="folder" title="New composition (⌘/Ctrl Alt N)" onClick={newProject} />
        <Button
          icon="undo"
          title="Undo (⌘/Ctrl Z)"
          disabled={!historyCount.past}
          onClick={() => undo()}
        />
        <Button
          icon="redo"
          title="Redo (⌘/Ctrl Shift Z)"
          disabled={!historyCount.future}
          onClick={() => undo(true)}
        />
        <span className={ui('separator')} />
        <Button icon="upload" title="Import score" onClick={() => importInput.current?.click()} />
        <Button
          icon="code"
          className={ui('code-button')}
          title="Edit code"
          onClick={() => openJSON()}
        >
          Code
        </Button>
        <Button icon="download" className={ui('primary')} onClick={() => setModal('export')}>
          Export
        </Button>
      </div>
    </header>
  );
}
