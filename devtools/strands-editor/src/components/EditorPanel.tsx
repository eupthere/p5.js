import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

type EditorPanelProps = {
  isHidden?: boolean;
  title: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  languageSupport?: boolean;
};

export function EditorPanel({
  isHidden = false,
  title,
  value,
  onChange,
  readOnly = false,
  languageSupport = true,
}: EditorPanelProps) {
  return (
    <article className={`flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${isHidden ? 'hidden' : ''}`}>
      <header className="px-4 py-4">
        <div className="min-w-0">
          <h2 className="m-0 text-base font-medium text-[#ED225D]">{title}</h2>
        </div>
      </header>
      <div className="rounded-[4px] editor-body min-h-0 flex-1 overflow-hidden">
        <CodeMirror
          className="h-full"
          value={value}
          height="100%"
          extensions={languageSupport ? [javascript()] : []}
          onChange={onChange}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: false,
          }}
          editable={!readOnly}
          theme="none"
        />
      </div>
    </article>
  );
}
