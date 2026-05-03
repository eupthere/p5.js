import { useEffect, useRef } from 'react';
import { StateEffect, StateField } from '@codemirror/state';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { Decoration, EditorView } from '@codemirror/view';

export type EditorHighlightRange = {
  from: number;
  to: number;
};

const setHighlightsEffect = StateEffect.define<EditorHighlightRange[]>();
const clearHighlightsEffect = StateEffect.define<void>();

const transientHighlightMark = Decoration.mark({
  class: 'cm-transient-highlight',
});

const transientHighlightField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(highlights, transaction) {
    highlights = highlights.map(transaction.changes);

    for (const effect of transaction.effects) {
      if (effect.is(setHighlightsEffect)) {
        return Decoration.set(
          effect.value.map((range) =>
            transientHighlightMark.range(range.from, range.to)
          ),
          true
        );
      }

      if (effect.is(clearHighlightsEffect)) {
        return Decoration.none;
      }
    }

    return highlights;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const transientHighlightTheme = EditorView.theme({
  '.cm-transient-highlight': {
    animation: 'cm-transient-highlight-fade 1s ease-out forwards',
    backgroundColor: 'rgba(237, 34, 93, 0.35)',
    borderRadius: '2px',
  },
});

type EditorPanelProps = {
  isHidden?: boolean;
  title: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  languageSupport?: boolean;
  highlightRanges?: EditorHighlightRange[];
};

export function EditorPanel({
  isHidden = false,
  title,
  value,
  onChange,
  readOnly = false,
  languageSupport = true,
  highlightRanges = [],
}: EditorPanelProps) {
  const editorViewRef = useRef<EditorView | null>(null);
  const clearHighlightTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const editorView = editorViewRef.current;
    if (!editorView) return undefined;
    if (highlightRanges.length === 0) return undefined;

    const normalizedRanges = highlightRanges
      .map((range) => normalizeRange(range, editorView.state.doc.length))
      .filter((range): range is EditorHighlightRange => range !== null);

    if (normalizedRanges.length === 0) {
      return undefined;
    }

    const firstRange = normalizedRanges[0];
    editorView.dispatch({
      effects: [
        setHighlightsEffect.of(normalizedRanges),
        EditorView.scrollIntoView(firstRange.from, {
          y: 'nearest',
          x: 'nearest',
          yMargin: 48,
        }),
      ],
    });

    if (clearHighlightTimeoutRef.current !== null) {
      window.clearTimeout(clearHighlightTimeoutRef.current);
    }

    clearHighlightTimeoutRef.current = window.setTimeout(() => {
      if (!editorViewRef.current) return;

      editorViewRef.current.dispatch({
        effects: [clearHighlightsEffect.of(undefined)],
      });
      clearHighlightTimeoutRef.current = null;
    }, 1000);

    return () => {
      if (clearHighlightTimeoutRef.current !== null) {
        window.clearTimeout(clearHighlightTimeoutRef.current);
        clearHighlightTimeoutRef.current = null;
      }
    };
  }, [highlightRanges]);

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
          extensions={[
            transientHighlightField,
            transientHighlightTheme,
            ...(languageSupport ? [javascript()] : []),
          ]}
          onChange={onChange}
          onCreateEditor={(editorView) => {
            editorViewRef.current = editorView;
          }}
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

function normalizeRange(
  range: EditorHighlightRange,
  documentLength: number
): EditorHighlightRange | null {
  if (documentLength === 0) {
    return null;
  }

  const from = clamp(range.from, 0, documentLength);
  const to = clamp(range.to, 0, documentLength);

  if (from === to) {
    if (from >= documentLength) {
      return {
        from: documentLength - 1,
        to: documentLength,
      };
    }

    return {
      from,
      to: from + 1,
    };
  }

  return {
    from: Math.min(from, to),
    to: Math.max(from, to),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
