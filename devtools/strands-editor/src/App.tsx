import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { injectPreviewBridge } from './preview-bridge'
import ParentWindowAdapter from './preview-parent-adapter'
import './App.css'
import {
  SOURCE_INITIAL,
  INTERNAL_CALLBACK_INITIAL,
  SHADER_INITIAL,
} from './initial-code'
import type { ShaderCapture } from './preview-bridge'

function App() {
  const [sourceCode, setSourceCode] = useState(SOURCE_INITIAL)
  const [internalCallback, setInternalCallback] = useState(INTERNAL_CALLBACK_INITIAL)
  const [shaderCode, setShaderCode] = useState(SHADER_INITIAL)
  const [captures, setCaptures] = useState<ShaderCapture[]>([])
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const previewSrcDoc = useMemo(() => buildPreviewSrcDoc(sourceCode), [sourceCode])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    let cancelled = false
    const connect = async () => {
      if (!iframe.contentWindow) return

      try {
        const bridge = injectPreviewBridge(new ParentWindowAdapter(iframe.contentWindow))
        await bridge.onState((state) => {
          if (cancelled) return
          if (Array.isArray(state.captures)) {
            setCaptures(state.captures)
          }
        })

        const initialState = await bridge.getState()
        if (!cancelled) {
          if (Array.isArray(initialState.captures)) {
            setCaptures(initialState.captures)
          }
        }
      } catch (error) {
        console.error('Failed to connect preview bridge', error)
      }
    }

    const handleLoad = () => {
      void connect()
    }

    iframe.addEventListener('load', handleLoad)
    void connect()

    return () => {
      cancelled = true
      iframe.removeEventListener('load', handleLoad)
    }
  }, [previewSrcDoc])

  useEffect(() => {
    if (captures.length === 0) {
      setInternalCallback(INTERNAL_CALLBACK_INITIAL)
      setShaderCode(SHADER_INITIAL)
      return
    }

    setInternalCallback(joinCaptureSections(captures, 'callbackBody'))
    setShaderCode(joinCaptureSections(captures, 'shaderSource'))
  }, [captures])

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
  )
}

function joinCaptureSections(
  captures: ShaderCapture[],
  field: 'callbackBody' | 'shaderSource'
) {
  return captures
    .map((capture) => {
      const content = capture[field]?.trim()
      if (!content) {
        return `// ${capture.kind}: ${capture.name}\n// No output captured yet.`
      }

      return [
        `// ${capture.kind}: ${capture.name}`,
        '// -----------------------------------------------------------------------------',
        content,
      ].join('\n')
    })
    .join('\n\n// =============================================================================\n\n')
}

function buildPreviewSrcDoc(sourceCode: string) {
  const escapedSource = sourceCode.replaceAll('</script>', '<\\/script>')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background: #f7f4ef;
        color: #201814;
        font-family: sans-serif;
      }

      main {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: auto;
      }

      #canvas-host {
        min-width: 100%;
        min-height: 100%;
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
      }

      canvas {
        display: block;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
      }

      #error {
        position: absolute;
        inset: 0;
        overflow: auto;
        padding: 12px;
        background: #fff4f4;
        color: #9f1239;
        border-left: 4px solid #e11d48;
        display: none;
      }
    </style>
  </head>
  <body>
    <main>
      <div id="canvas-host"></div>
      <div id="error"></div>
    </main>
    <script src="/p5.js"></script>
    <script src="/p5.webgpu.js"></script>
    <script>
      window.__STRANDS_SOURCE__ = ${JSON.stringify(escapedSource)};
    </script>
    <script type="module" src="/src/preview-frame-runtime.ts"></script>
  </body>
</html>`
}

type EditorPanelProps = {
  title: string
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
}

function EditorPanel({
  title,
  value,
  onChange,
  readOnly = false,
}: EditorPanelProps) {
  return (
    <article className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
          extensions={[javascript()]}
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
  )
}

type PreviewPanelProps = {
  iframeRef: RefObject<HTMLIFrameElement | null>
  srcDoc: string
}

function PreviewPanel({ iframeRef, srcDoc }: PreviewPanelProps) {
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
  )
}

export default App
