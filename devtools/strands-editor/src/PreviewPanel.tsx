import type { RefObject } from 'react';

type PreviewPanelProps = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  srcDoc: string;
};

export function PreviewPanel({ iframeRef, srcDoc }: PreviewPanelProps) {
  return (
    <article className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="px-4 py-4">
        <h2 className="m-0 text-base font-medium text-[#ED225D]">Preview</h2>
      </header>
      <div className="min-h-0 flex-1 overflow-auto rounded-[4px] border border-black/10">
        <iframe
          ref={iframeRef}
          title="Sandboxed p5 preview"
          className="h-full w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin"
          srcDoc={srcDoc}
        />
      </div>
    </article>
  );
}
