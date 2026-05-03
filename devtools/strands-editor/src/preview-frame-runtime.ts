import { previewBridgeService, providePreviewBridge } from './preview-bridge'
import PreviewFrameAdapter from './preview-frame-adapter'

declare global {
  interface Window {
    __STRANDS_SOURCE__?: string
    setup?: () => void | Promise<void>
    draw?: () => void | Promise<void>
    preload?: () => void | Promise<void>
    p5?: new () => {
      canvas?: HTMLCanvasElement
      remove?: () => void
    }
    defaultCanvas0?: HTMLCanvasElement
  }
}

const service = previewBridgeService
providePreviewBridge(new PreviewFrameAdapter())

const errorNode = document.getElementById('error')
const canvasHost = document.getElementById('canvas-host')
const sourceCode = window.__STRANDS_SOURCE__ ?? ''

function showError(error: unknown) {
  const message = String(error && typeof error === 'object' && 'stack' in error ? error.stack : error)
  if (errorNode) {
    errorNode.style.display = 'block'
    errorNode.innerHTML = `<pre>${message}</pre>`
  }
  service.update({ error: message })
}

window.addEventListener('error', (event) => {
  showError(event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  showError(event.reason || 'Unhandled promise rejection')
})

const OriginalFunction = globalThis.Function

function WrappedFunction(...args: unknown[]) {
  if (args[0] === '__p5' && typeof args.at(-1) === 'string') {
    service.update({
      internalCallback: String(args.at(-1)),
    })
  }

  return OriginalFunction(...args)
}

WrappedFunction.prototype = OriginalFunction.prototype
Object.setPrototypeOf(WrappedFunction, OriginalFunction)
globalThis.Function = WrappedFunction as FunctionConstructor

function captureShaderSource(shader: any) {
  queueMicrotask(() => {
    try {
      if (shader?.computeSrc) {
        service.update({ shaderSource: shader.computeSrc() })
        return
      }

      const sections: string[] = []
      if (shader?.vertSrc) {
        sections.push(`// Vertex\n${shader.vertSrc()}`)
      }
      if (shader?.fragSrc) {
        sections.push(`// Fragment\n${shader.fragSrc()}`)
      }
      if (sections.length > 0) {
        service.update({ shaderSource: sections.join('\n\n') })
      }
    } catch (error) {
      showError(error)
    }
  })
}

function patchShaderBuilders() {
  const p5Ctor = window.p5
  if (!p5Ctor) return

  const methodNames = ['buildComputeShader', 'buildFilterShader']
  for (const methodName of methodNames) {
    const original = (p5Ctor as any).prototype?.[methodName]
    if (typeof original !== 'function') continue

    ;(p5Ctor as any).prototype[methodName] = function patchedShaderBuilder(...args: unknown[]) {
      const shader = original.apply(this, args)
      captureShaderSource(shader)
      return shader
    }
  }
}

function executeSketchAsGlobalScript(source: string) {
  const script = document.createElement('script')
  script.textContent = source
  document.body.appendChild(script)
  script.remove()
}

function boot() {
  patchShaderBuilders()
  executeSketchAsGlobalScript(sourceCode)

  const hasGlobalSketch =
    typeof window.setup === 'function' ||
    typeof window.draw === 'function' ||
    typeof window.preload === 'function'

  if (!hasGlobalSketch || !window.p5) {
    return
  }

  const sketchInstance = new window.p5()

  requestAnimationFrame(() => {
    if (!canvasHost) return
    if (sketchInstance?.canvas) {
      canvasHost.appendChild(sketchInstance.canvas)
    } else if (window.defaultCanvas0) {
      canvasHost.appendChild(window.defaultCanvas0)
    }
  })
}

try {
  boot()
} catch (error) {
  showError(error)
}
