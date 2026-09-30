'use client';
import { EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
export default function CodeEditor({
  value,
  onChange,
  label,
  language = 'json',
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  language?: 'json' | 'javascript';
}) {
  return (
    <div
      data-code-value={value}
      className="overflow-hidden rounded-lg border border-zinc-700 [&_.cm-editor]:font-mono [&_.cm-editor]:text-sm [&_.cm-focused]:outline-violet-400"
    >
      <label className="mb-1 block px-2 pt-2 text-xs text-zinc-500">
        {label} · syntax highlighting · Tab to indent
      </label>
      <CodeMirror
        value={value}
        onChange={onChange}
        height="360px"
        theme={oneDark}
        extensions={[
          language === 'javascript' ? javascript() : json(),
          EditorView.contentAttributes.of({
            'aria-label': label,
            role: 'textbox',
            'aria-multiline': 'true',
          }),
        ]}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          autocompletion: true,
          bracketMatching: true,
        }}
        aria-label={label}
      />
    </div>
  );
}
