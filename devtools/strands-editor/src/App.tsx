import { useState } from 'react'
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

  return (
    <main className="h-screen overflow-hidden px-4 py-5 bg-white text-black sm:px-5 lg:px-7">
      <header className="mx-auto mb-6 flex max-w-[1800px] flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="m-0 text-[clamp(1rem,4vw,2rem)] leading-[0.95] font-medium tracking-[-0.03em] text-[#ED225D]">
            Strands Editor
          </h1>
        </div>
      </header>

      <section className="mx-auto flex h-[calc(100vh-8.5rem)] max-h-[calc(100vh-8.5rem)] max-w-[1800px] flex-col items-stretch overflow-hidden lg:h-[calc(100vh-10rem)] lg:max-h-[calc(100vh-10rem)] lg:flex-row">
        <EditorPanel
          title="Sketch"
          value={sourceCode}
          onChange={setSourceCode}
        />
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

export default App
