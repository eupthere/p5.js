import { useMemo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import './App.css'
import {
  SOURCE_INITIAL,
  INTERNAL_CALLBACK_INITIAL,
  SHADER_INITIAL,
} from './initial-code'

function App() {
  const [sourceCode, setSourceCode] = useState(SOURCE_INITIAL)
  const [internalCallback, setInternalCallback] = useState(INTERNAL_CALLBACK_INITIAL)
  const [shaderCode, setShaderCode] = useState(SHADER_INITIAL)

  const previewSrcDoc = useMemo(() => buildPreviewSrcDoc(sourceCode), [sourceCode])

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
        <PreviewPanel srcDoc={previewSrcDoc} />
        <EditorPanel
          title="Internal Strands Callback"
          value={internalCallback}
          onChange={setInternalCallback}
        />
        <EditorPanel
          title="Shader"
          value={shaderCode}
          onChange={setShaderCode}
        />
      </section>
    </main>
  )
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
        overflow: hidden;
        background: #f7f4ef;
        color: #201814;
        font-family: sans-serif;
      }

      main {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      #canvas-host {
        width: 100%;
        height: 100%;
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
      const errorNode = document.getElementById('error');

      function showError(error) {
        errorNode.style.display = 'block';
        errorNode.innerHTML = '<pre>' + String(error && error.stack ? error.stack : error) + '</pre>';
      }

      window.addEventListener('error', (event) => {
        showError(event.error || event.message);
      });

      window.addEventListener('unhandledrejection', (event) => {
        showError(event.reason || 'Unhandled promise rejection');
      });
    </script>
    <script>
      ${escapedSource}
    </script>
    <script>
      const hasGlobalSketch =
        typeof window.setup === 'function' ||
        typeof window.draw === 'function' ||
        typeof window.preload === 'function';

      if (hasGlobalSketch && window.p5) {
        const sketchInstance = new window.p5();

        requestAnimationFrame(() => {
          const host = document.getElementById('canvas-host');
          if (sketchInstance && sketchInstance.canvas) {
            host.appendChild(sketchInstance.canvas);
          } else if (window.defaultCanvas0) {
            host.appendChild(window.defaultCanvas0);
          }
        });
      }
    </script>
  </body>
</html>`
}

type EditorPanelProps = {
  title: string
  value: string
  onChange: (value: string) => void
}

function EditorPanel({
  title,
  value,
  onChange,
}: EditorPanelProps) {
  return (
    <article className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="px-4 py-4">
        <div>
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
          theme="none"
        />
      </div>
    </article>
  )
}

type PreviewPanelProps = {
  srcDoc: string
}

function PreviewPanel({ srcDoc }: PreviewPanelProps) {
  return (
    <article className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="px-4 py-4">
        <h2 className="m-0 text-base font-medium text-[#ED225D]">Preview</h2>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden rounded-[4px] border border-black/10">
        <iframe
          title="Sandboxed p5 preview"
          className="h-full w-full border-0 bg-white"
          sandbox="allow-scripts"
          srcDoc={srcDoc}
        />
      </div>
    </article>
  )
}

export default App
