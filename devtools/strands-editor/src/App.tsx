import { useEffect, useMemo, useRef, useState } from 'react';
import { injectPreviewBridge } from './preview-bridge';
import ParentWindowAdapter from './preview-parent-adapter';
import './App.css';
import { EditorPanel } from './EditorPanel';
import { joinCaptureSections } from './format-captures';
import {
  SOURCE_INITIAL,
  INTERNAL_CALLBACK_INITIAL,
  SHADER_INITIAL,
} from './initial-code';
import { PreviewPanel } from './PreviewPanel';
import { buildPreviewSrcDoc } from './preview-srcdoc';
import type { ShaderCapture } from './preview-types';
import { useDebouncedValue } from './use-debounced-value';

const PREVIEW_DEBOUNCE_MS = 300;

function App() {
  const [sourceCode, setSourceCode] = useState(SOURCE_INITIAL);
  const [internalCallback, setInternalCallback] = useState(INTERNAL_CALLBACK_INITIAL);
  const [shaderCode, setShaderCode] = useState(SHADER_INITIAL);
  const [captures, setCaptures] = useState<ShaderCapture[]>([]);
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

  return (
    <main className="h-screen overflow-hidden px-4 py-5 bg-white text-black sm:px-5 lg:px-7">
      <header className="mx-auto mb-6 flex max-w-[1800px] flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="m-0 text-[clamp(1rem,4vw,2rem)] leading-[0.95] font-medium tracking-[-0.03em] text-[#ED225D]">
            Strands Editor
          </h1>
        </div>
      </header>

      <section className="mx-auto flex h-[calc(100vh-8.5rem)] max-h-[calc(100vh-8.5rem)] max-w-[1800px] flex-col items-stretch gap-5 overflow-hidden lg:h-[calc(100vh-10rem)] lg:max-h-[calc(100vh-10rem)] lg:flex-row">
        <EditorPanel
          title="Sketch"
          value={sourceCode}
          onChange={setSourceCode}
        />
        <PreviewPanel iframeRef={iframeRef} srcDoc={previewSrcDoc} />
        <EditorPanel
          title="Internal Strands Callback"
          value={internalCallback}
          onChange={setInternalCallback}
          readOnly
        />
        <EditorPanel
          title="Shader"
          value={shaderCode}
          onChange={setShaderCode}
          readOnly
        />
      </section>
    </main>
  );
}

export default App;
