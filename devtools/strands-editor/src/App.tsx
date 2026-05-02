import { useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import './App.css'

const sourceInitial = 
`// Authored by Dave Pagurek to demonstrate an unreleased feature

let cells;
let nextCells;
let gameShader;
let displayShader;
let W = 0;
let H = 0;

async function setup() {
  W = windowWidth;
  H = windowHeight;
  await createCanvas(windowWidth, windowHeight, WEBGPU);
  pixelDensity(1);

  let initial = new Float32Array(W * H);
  for (let i = 0; i < initial.length; i++) {
    initial[i] = random() > 0.7 ? 1 : 0;
  }
  cells = createStorage(initial);
  nextCells = createStorage(W * H);

  gameShader = buildComputeShader(simulate);
  displayShader = buildFilterShader(display);
}

function simulate() {
  let current = uniformStorage(() => cells);
  let next = uniformStorage(() => nextCells);
  let w = uniformInt(() => W);
  let h = uniformInt(() => H);
  let x = index.x;
  let y = index.y;

  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx != 0 || dy != 0) {
        let nx = (x + dx + w) % w;
        let ny = (y + dy + h) % h;
        n += current[ny * w + nx];
      }
    }
  }

  let alive = current[y * w + x];
  let nextOutput = 0;
  if (alive == 1) {
    if (n == 2 || n == 3) {
      nextOutput = 1;
    }
  } else {
    if (n == 3) {
      nextOutput = 1;
    }
  }
  next[y * w + x] = nextOutput;
}

function display() {
  let data = uniformStorage(() => cells);
  let w = uniformInt(() => W);
  let h = uniformInt(() => H);

  filterColor.begin();
  let x = floor(filterColor.texCoord.x * w);
  let y = floor(filterColor.texCoord.y * h);
  let alive = data[y * w + x];
  filterColor.set([alive, alive, alive, 1]);
  filterColor.end();
}

function draw() {
  compute(gameShader, W, H);
  [nextCells, cells] = [cells, nextCells];
  filter(displayShader);
}`

const internalCallbackInitial = `function (__p5, scope) {
  const tint = uniformFloat(() => 0.65);

  getPixelInputs((inputs) => {
    inputs.color = [inputs.texCoord.x, inputs.texCoord.y, tint, 1.0];
    return inputs;
  });
}`

const shaderInitial = `vec4 getFinalColor(vec4 color, vec2 texCoord) {
  color.rgb = vec3(texCoord.xy, 0.65);
  color.a = 1.0;
  return color;
}`

function App() {
  const [sourceCode, setSourceCode] = useState(sourceInitial)
  const [internalCallback, setInternalCallback] = useState(internalCallbackInitial)
  const [shaderCode, setShaderCode] = useState(shaderInitial)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(208,106,57,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(96,150,167,0.16),transparent_32%),linear-gradient(180deg,#171412_0%,#0d0c0b_100%)] px-4 py-5 text-[#f3efe7] sm:px-5 lg:px-7">
      <header className="mx-auto mb-6 flex max-w-[1800px] flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2.5 text-xs uppercase tracking-[0.16em] text-[#cf8f52]">
            Strands Tooling
          </p>
          <h1 className="m-0 text-[clamp(2rem,4vw,3.2rem)] leading-[0.95] font-medium tracking-[-0.03em] text-[#fff8ef]">
            Compiler Surface Viewer
          </h1>
        </div>
        <p className="max-w-[32rem] text-sm leading-6 text-[#b9b0a2] sm:text-base">
          Source, internal callback, and emitted shader side by side. No p5 wiring yet,
          just the working editor shell.
        </p>
      </header>

      <section className="mx-auto grid max-w-[1800px] grid-cols-1 gap-4 lg:min-h-[calc(100vh-10rem)] lg:grid-cols-3">
        <EditorPanel
          accent="bg-[#d06a39]"
          title="Source"
          subtitle="Strands sketch input"
          value={sourceCode}
          onChange={setSourceCode}
        />
        <EditorPanel
          accent="bg-[#5fa1b1]"
          title="Internal Strands Callback"
          subtitle="Transpiled function body"
          value={internalCallback}
          onChange={setInternalCallback}
        />
        <EditorPanel
          accent="bg-[#9dc25b]"
          title="Shader"
          subtitle="Generated shader code"
          value={shaderCode}
          onChange={setShaderCode}
        />
      </section>
    </main>
  )
}

type EditorPanelProps = {
  accent: string
  title: string
  subtitle: string
  value: string
  onChange: (value: string) => void
}

function EditorPanel({
  accent,
  title,
  subtitle,
  value,
  onChange,
}: EditorPanelProps) {
  return (
    <article className="flex min-h-[20rem] flex-col overflow-hidden rounded-[24px] border border-white/8 bg-[rgba(17,15,14,0.78)] shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
      <header className="border-b border-white/6 px-4 py-4">
        <span className={`mb-3 block h-[3px] w-full rounded-full ${accent}`} />
        <div>
          <h2 className="m-0 text-base font-medium text-[#fff5e7]">{title}</h2>
          <p className="mt-1.5 text-sm text-[#8f877b]">{subtitle}</p>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <CodeMirror
          value={value}
          height="100%"
          extensions={[javascript()]}
          onChange={onChange}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: false,
          }}
          theme="dark"
        />
      </div>
    </article>
  )
}

export default App
