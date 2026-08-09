import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { keymap } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';

interface Props {
  /** Identity of the document; remounting content when it changes. */
  path: string;
  source: string;
  onChange: (contents: string) => void;
  onSave: () => void;
}

/** CodeMirror 6 Markdown editor. Ctrl/Cmd+S triggers onSave. */
export function MarkdownEditor({ path, source, onChange, onSave }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onSave });
  callbacks.current = { onChange, onSave };

  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      doc: source,
      parent: host.current,
      extensions: [
        basicSetup,
        markdown(),
        EditorView.lineWrapping,
        keymap.of([
          {
            key: 'Mod-s',
            preventDefault: true,
            run: () => {
              callbacks.current.onSave();
              return true;
            },
          },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            callbacks.current.onChange(update.state.doc.toString());
          }
        }),
      ],
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // Recreate the editor only when switching documents; `source` is read
    // once as the initial doc, so it is intentionally not a dependency.
  }, [path]);

  return <div className="cm-host" ref={host} />;
}
