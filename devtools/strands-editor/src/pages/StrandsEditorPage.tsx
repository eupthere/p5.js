import { useEffect, useRef, useState } from 'react';
import { injectPreviewBridge } from '../runtime/bridge';
import ParentWindowAdapter from '../runtime/parentAdapter';
import {
  PREVIEW_SOURCE_MESSAGE_TYPE,
  isPreviewReadyMessage,
} from '../runtime/messages';
import '../styles/app.css';
import {
  EditorPanel,
  type EditorHighlightRange,
} from '../components/EditorPanel';
import { joinCaptureSections } from '../utils/formatCaptures';
import {
  SOURCE_INITIAL,
  INTERNAL_CALLBACK_INITIAL,
  SHADER_INITIAL,
} from '../data/initialCode';
import { PreviewPanel } from '../components/PreviewPanel';
import type { ShaderCapture } from '../runtime/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { findChangedRanges } from '../utils/findChangedRanges';

const PREVIEW_DEBOUNCE_MS = 300;
const PREVIEW_LOADING_TOAST_MIN_MS = 1000;
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

type CapturedOutput = {
  callback: string;
  shader: string;
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
  const [, setCapturedOutput] = useState<CapturedOutput>({
    callback: '',
    shader: '',
  });
  const [callbackHighlightRanges, setCallbackHighlightRanges] = useState<
    EditorHighlightRange[]
  >([]);
  const [shaderHighlightRanges, setShaderHighlightRanges] = useState<
    EditorHighlightRange[]
  >([]);
  const [captures, setCaptures] = useState<ShaderCapture[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showPreviewLoadingToast, setShowPreviewLoadingToast] = useState(false);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [visiblePanels, setVisiblePanels] = useState<Record<PanelId, boolean>>(
    () => loadStoredVisiblePanels()
  );
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isBridgeConnectedRef = useRef(false);
  const loadingToastShownAtRef = useRef<number | null>(null);
  const hideLoadingToastTimeoutRef = useRef<number | null>(null);
  const debouncedSourceCode = useDebouncedValue(sourceCode, PREVIEW_DEBOUNCE_MS);
  const previewFrameSrc = '/frame.html';

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let cancelled = false;
    let connectTask: Promise<void> | null = null;
    let statePollIntervalId: number | null = null;
    isBridgeConnectedRef.current = false;

    const applyState = (state: {
      captures?: ShaderCapture[];
      isLoading?: boolean;
    }) => {
      if (cancelled) return;
      if (Array.isArray(state.captures)) {
        setCaptures(state.captures);
      }
      if (typeof state.isLoading === 'boolean') {
        setIsPreviewLoading(state.isLoading);
      }
    };

    const connect = async () => {
      if (!iframe.contentWindow) return false;
      if (isBridgeConnectedRef.current) return true;

      try {
        const bridge = injectPreviewBridge(new ParentWindowAdapter(iframe.contentWindow));
        await bridge.onState((state) => {
          applyState(state);
        });

        const syncState = async () => {
          const state = await bridge.getState();
          applyState(state);
        };

        await syncState();

        if (statePollIntervalId === null) {
          statePollIntervalId = window.setInterval(() => {
            syncState().catch(() => {});
          }, 250);
        }

        isBridgeConnectedRef.current = true;
        return true;
      } catch (error) {
        return false;
      }
    };

    const connectWithRetry = async () => {
      if (connectTask) {
        await connectTask;
        return;
      }

      connectTask = (async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (cancelled) return;

        const didConnect = await connect();
        if (didConnect) {
          return;
        }

        await new Promise((resolve) => {
          window.setTimeout(resolve, 250);
        });
      }

      if (!cancelled) {
        console.error(
          'Failed to connect preview bridge',
          new Error('Provider unavailable after retries')
        );
      }
      })();

      try {
        await connectTask;
      } finally {
        connectTask = null;
      }
    };

    const handleFrameReady = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      if (event.origin !== window.location.origin) return;
      if (!isPreviewReadyMessage(event.data)) return;
      setIsPreviewReady(true);
      connectWithRetry();
    };

    window.addEventListener('message', handleFrameReady);

    const handleLoad = () => {
      connectWithRetry();
    };

    iframe.addEventListener('load', handleLoad);

    return () => {
      cancelled = true;
      isBridgeConnectedRef.current = false;
      setIsPreviewReady(false);
      setIsPreviewLoading(false);
      setShowPreviewLoadingToast(false);
      loadingToastShownAtRef.current = null;
      if (hideLoadingToastTimeoutRef.current !== null) {
        window.clearTimeout(hideLoadingToastTimeoutRef.current);
        hideLoadingToastTimeoutRef.current = null;
      }
      if (statePollIntervalId !== null) {
        window.clearInterval(statePollIntervalId);
      }
      window.removeEventListener('message', handleFrameReady);
      iframe.removeEventListener('load', handleLoad);
    };
  }, []);

  useEffect(() => {
    if (hideLoadingToastTimeoutRef.current !== null) {
      window.clearTimeout(hideLoadingToastTimeoutRef.current);
      hideLoadingToastTimeoutRef.current = null;
    }

    if (isPreviewLoading) {
      loadingToastShownAtRef.current = Date.now();
      setShowPreviewLoadingToast(true);
      return;
    }

    const shownAt = loadingToastShownAtRef.current;
    if (shownAt === null) {
      setShowPreviewLoadingToast(false);
      return;
    }

    const elapsed = Date.now() - shownAt;
    const remaining = Math.max(0, PREVIEW_LOADING_TOAST_MIN_MS - elapsed);

    if (remaining === 0) {
      setShowPreviewLoadingToast(false);
      loadingToastShownAtRef.current = null;
      return;
    }

    hideLoadingToastTimeoutRef.current = window.setTimeout(() => {
      setShowPreviewLoadingToast(false);
      loadingToastShownAtRef.current = null;
      hideLoadingToastTimeoutRef.current = null;
    }, remaining);

    return () => {
      if (hideLoadingToastTimeoutRef.current !== null) {
        window.clearTimeout(hideLoadingToastTimeoutRef.current);
        hideLoadingToastTimeoutRef.current = null;
      }
    };
  }, [isPreviewLoading]);

  useEffect(() => {
    if (!isPreviewReady) return;
    if (!iframeRef.current?.contentWindow) return;

    iframeRef.current.contentWindow.postMessage(
      {
        type: PREVIEW_SOURCE_MESSAGE_TYPE,
        source: debouncedSourceCode,
      },
      window.location.origin
    );
  }, [debouncedSourceCode, isPreviewReady]);

  useEffect(() => {
    if (captures.length === 0) {
      setInternalCallback(INTERNAL_CALLBACK_INITIAL);
      setShaderCode(SHADER_INITIAL);
      setCallbackHighlightRanges([]);
      setShaderHighlightRanges([]);
      return;
    }

    const nextInternalCallback = joinCaptureSections(captures, 'callbackBody');
    const nextShaderCode = joinCaptureSections(captures, 'shaderSource');
    const hasCallbackOutput = captures.some(
      (capture) => capture.callbackBody.trim() !== ''
    );
    const hasShaderOutput = captures.some(
      (capture) => capture.shaderSource.trim() !== ''
    );

    setInternalCallback(nextInternalCallback);
    setShaderCode(nextShaderCode);
    setCapturedOutput((currentOutput) => {
      const nextCallbackHighlightRanges = hasCallbackOutput
        ? findChangedRanges(currentOutput.callback, nextInternalCallback)
        : [];
      const nextShaderHighlightRanges = hasShaderOutput
        ? findChangedRanges(currentOutput.shader, nextShaderCode)
        : [];

      setCallbackHighlightRanges(nextCallbackHighlightRanges);
      setShaderHighlightRanges(nextShaderHighlightRanges);

      return {
        callback: hasCallbackOutput ? nextInternalCallback : currentOutput.callback,
        shader: hasShaderOutput ? nextShaderCode : currentOutput.shader,
      };
    });
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
      {showPreviewLoadingToast ? (
        <div className="preview-loading-toast" role="status" aria-live="polite">
          Loading preview assets…
        </div>
      ) : null}
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
          src={previewFrameSrc}
        />
        <EditorPanel
          isHidden={!visiblePanels.callback}
          title="Internal Strands Callback"
          value={internalCallback}
          onChange={setInternalCallback}
          readOnly
          highlightRanges={callbackHighlightRanges}
        />
        <EditorPanel
          isHidden={!visiblePanels.shader}
          title="Shader"
          value={shaderCode}
          onChange={setShaderCode}
          readOnly
          languageSupport={false}
          highlightRanges={shaderHighlightRanges}
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
