import { useEffect, useMemo, useRef, useState } from 'react';
import { injectPreviewBridge } from '../preview/bridge';
import ParentWindowAdapter from '../preview/parentAdapter';
import '../styles/app.css';
import { EditorPanel } from '../components/EditorPanel';
import { joinCaptureSections } from '../utils/formatCaptures';
import {
  SOURCE_INITIAL,
  INTERNAL_CALLBACK_INITIAL,
  SHADER_INITIAL,
} from '../data/initialCode';
import { PreviewPanel } from '../components/PreviewPanel';
import { buildPreviewSrcDoc } from '../preview/srcdoc';
import type { ShaderCapture } from '../preview/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const PREVIEW_DEBOUNCE_MS = 300;
const PANEL_IDS = ['source', 'preview', 'callback', 'shader'] as const;
type PanelId = (typeof PANEL_IDS)[number];
const SOURCE_STORAGE_KEY = 'strands-editor:source-code';
const PANEL_VISIBILITY_STORAGE_KEY = 'strands-editor:panel-visibility';

const PANEL_LABELS: Record<PanelId, string> = {
  source: 'Source',
  preview: 'Preview',
  callback: 'Internal Callback',
  shader: 'Shader',
};

const DEFAULT_VISIBLE_PANELS: Record<PanelId, boolean> = {
  source: true,
  preview: true,
  callback: true,
  shader: true,
};

function StrandsEditorPage() {
  const [sourceCode, setSourceCode] = useState(() => loadStoredSourceCode());
  const [internalCallback, setInternalCallback] = useState(INTERNAL_CALLBACK_INITIAL);
  const [shaderCode, setShaderCode] = useState(SHADER_INITIAL);
  const [captures, setCaptures] = useState<ShaderCapture[]>([]);
  const [visiblePanels, setVisiblePanels] = useState<Record<PanelId, boolean>>(
    () => loadStoredVisiblePanels()
  );
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const debouncedSourceCode = useDebouncedValue(sourceCode, PREVIEW_DEBOUNCE_MS);

  const previewSrcDoc = useMemo(
    () => buildPreviewSrcDoc(debouncedSourceCode),
    [debouncedSourceCode]
  );

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let cancelled = false;
    const connect = async () => {
      if (!iframe.contentWindow) return;

      try {
        const bridge = injectPreviewBridge(new ParentWindowAdapter(iframe.contentWindow));
        await bridge.onState((state) => {
          if (cancelled) return;
          if (Array.isArray(state.captures)) {
            setCaptures(state.captures);
          }
        });

        const initialState = await bridge.getState();
        if (!cancelled) {
          if (Array.isArray(initialState.captures)) {
            setCaptures(initialState.captures);
          }
        }
      } catch (error) {
        console.error('Failed to connect preview bridge', error);
      }
    };

    const handleLoad = () => {
      connect();
    };

    iframe.addEventListener('load', handleLoad);
    connect();

    return () => {
      cancelled = true;
      iframe.removeEventListener('load', handleLoad);
    };
  }, [previewSrcDoc]);

  useEffect(() => {
    if (captures.length === 0) {
      setInternalCallback(INTERNAL_CALLBACK_INITIAL);
      setShaderCode(SHADER_INITIAL);
      return;
    }

    setInternalCallback(joinCaptureSections(captures, 'callbackBody'));
    setShaderCode(joinCaptureSections(captures, 'shaderSource'));
  }, [captures]);

  useEffect(() => {
    window.localStorage.setItem(SOURCE_STORAGE_KEY, sourceCode);
  }, [sourceCode]);

  useEffect(() => {
    window.localStorage.setItem(
      PANEL_VISIBILITY_STORAGE_KEY,
      JSON.stringify(visiblePanels)
    );
  }, [visiblePanels]);

  const togglePanel = (panelId: PanelId) => {
    setVisiblePanels((currentPanels) => ({
      ...currentPanels,
      [panelId]: !currentPanels[panelId],
    }));
  };

  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-white px-4 py-5 text-black sm:px-5 lg:px-7">
      <header className="mx-auto mb-6 flex w-full max-w-[1800px] flex-none flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="m-0 text-[clamp(1rem,4vw,2rem)] leading-[0.95] font-medium tracking-[-0.03em] text-[#ED225D]">
            Strands Editor
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {PANEL_IDS.map((panelId) => {
            const isVisible = visiblePanels[panelId];

            return (
              <button
                key={panelId}
                type="button"
                className={`rounded border px-3 py-1 text-sm transition ${
                  isVisible
                    ? 'border-[#ED225D] bg-[#ED225D] text-white'
                    : 'border-black/10 bg-white text-black'
                }`}
                onClick={() => togglePanel(panelId)}
              >
                {PANEL_LABELS[panelId]}
              </button>
            );
          })}
        </div>
      </header>

      <section className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col items-stretch gap-0 overflow-hidden lg:flex-row">
        <EditorPanel
          isHidden={!visiblePanels.source}
          title="Sketch"
          value={sourceCode}
          onChange={setSourceCode}
        />
        <PreviewPanel
          isHidden={!visiblePanels.preview}
          iframeRef={iframeRef}
          srcDoc={previewSrcDoc}
        />
        <EditorPanel
          isHidden={!visiblePanels.callback}
          title="Internal Strands Callback"
          value={internalCallback}
          onChange={setInternalCallback}
          readOnly
        />
        <EditorPanel
          isHidden={!visiblePanels.shader}
          title="Shader"
          value={shaderCode}
          onChange={setShaderCode}
          readOnly
          languageSupport={false}
        />
      </section>
    </main>
  );
}

function loadStoredSourceCode() {
  const storedSourceCode = window.localStorage.getItem(SOURCE_STORAGE_KEY);
  return storedSourceCode ?? SOURCE_INITIAL;
}

function loadStoredVisiblePanels(): Record<PanelId, boolean> {
  const storedVisiblePanels = window.localStorage.getItem(PANEL_VISIBILITY_STORAGE_KEY);
  if (!storedVisiblePanels) {
    return DEFAULT_VISIBLE_PANELS;
  }

  try {
    const parsedVisiblePanels = JSON.parse(storedVisiblePanels) as Partial<
      Record<PanelId, boolean>
    >;

    return {
      source: parsedVisiblePanels.source ?? DEFAULT_VISIBLE_PANELS.source,
      preview: parsedVisiblePanels.preview ?? DEFAULT_VISIBLE_PANELS.preview,
      callback: parsedVisiblePanels.callback ?? DEFAULT_VISIBLE_PANELS.callback,
      shader: parsedVisiblePanels.shader ?? DEFAULT_VISIBLE_PANELS.shader,
    };
  } catch {
    return DEFAULT_VISIBLE_PANELS;
  }
}

export default StrandsEditorPage;
