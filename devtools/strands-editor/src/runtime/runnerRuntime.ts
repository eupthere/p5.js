import { formatSourceCode } from '../utils/formatSource';
import {
  isRunnerRunSourceMessage,
  RUNNER_READY_MESSAGE_TYPE,
  RUNNER_STATE_UPDATE_MESSAGE_TYPE,
} from './messages';
import type { PreviewState, ShaderCapture, ShaderCaptureKind } from './types';
import {
  SHADER_CAPTURE_KINDS,
  getShaderBuilderMethodName,
  type ShaderBuilderMethodName,
} from './types';

declare global {
  interface Window {
    setup?: () => void | Promise<void>;
    draw?: () => void | Promise<void>;
    preload?: () => void | Promise<void>;
    p5?: new () => {
      canvas?: HTMLCanvasElement;
      remove?: () => void;
    };
    defaultCanvas0?: HTMLCanvasElement;
  }
}

const errorNode = document.getElementById('error');
const canvasHost = document.getElementById('canvas-host');

let captureSequence = 0;
let activeCaptureId: string | null = null;
let currentRevision: number | null = null;
let currentSketchInstance:
  | (InstanceType<NonNullable<typeof window.p5>> & { remove?: () => void })
  | null = null;
let hasPatchedShaderBuilders = false;
let lastBootedSource: string | null = null;

const capturesById = new Map<string, ShaderCapture>();
let previewState: PreviewState = {
  captures: [],
  error: '',
  isLoading: false,
};

function publishState() {
  if (currentRevision === null) return;

  window.parent.postMessage(
    {
      type: RUNNER_STATE_UPDATE_MESSAGE_TYPE,
      revision: currentRevision,
      state: previewState,
    },
    window.location.origin
  );
}

function updateState(partial: Partial<PreviewState>) {
  previewState = {
    ...previewState,
    ...partial,
  };
  publishState();
}

function showError(error: unknown) {
  const message = String(
    error && typeof error === 'object' && 'stack' in error ? error.stack : error
  );

  if (errorNode) {
    errorNode.style.display = 'block';
    errorNode.innerHTML = `<pre>${message}</pre>`;
  }

  updateState({ error: message });
}

window.addEventListener('error', (event) => {
  showError(event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  showError(event.reason || 'Unhandled promise rejection');
});

const OriginalFunction = globalThis.Function;

async function formatCallbackBody(callbackBody: string) {
  const wrapperPrefix = 'function __strands_callback(__p5, scope) {';
  const wrappedSource = `${wrapperPrefix}\n${callbackBody}\n}`;
  const formattedSource = await formatSourceCode(wrappedSource);
  const bodyStart = formattedSource.indexOf(wrapperPrefix);
  if (bodyStart === -1) {
    return callbackBody;
  }

  const contentStart = bodyStart + wrapperPrefix.length;
  const contentEnd = formattedSource.lastIndexOf('}');
  if (contentEnd === -1 || contentEnd <= contentStart) {
    return callbackBody;
  }

  const unwrappedBody = formattedSource
    .slice(contentStart, contentEnd)
    .replace(/^\n/, '')
    .replace(/\n\s*$/, '');

  return stripSharedIndent(unwrappedBody);
}

function WrappedFunction(...args: unknown[]) {
  if (activeCaptureId && args[0] === '__p5' && typeof args.at(-1) === 'string') {
    const captureId = activeCaptureId;
    const callbackBody = String(args.at(-1));

    formatCallbackBody(callbackBody)
      .then((formattedCallbackBody) => {
        updateCapture(captureId, {
          callbackBody: formattedCallbackBody,
        });
      })
      .catch(() => {
        updateCapture(captureId, {
          callbackBody,
        });
      });
  }

  return OriginalFunction(...(args as string[]));
}

WrappedFunction.prototype = OriginalFunction.prototype;
Object.setPrototypeOf(WrappedFunction, OriginalFunction);
globalThis.Function = WrappedFunction as FunctionConstructor;

function createCapture(kind: ShaderCaptureKind, name: string) {
  const capture: ShaderCapture = {
    id: `${kind}-${captureSequence++}`,
    kind,
    name,
    callbackBody: '',
    shaderSource: '',
  };

  capturesById.set(capture.id, capture);
  activeCaptureId = capture.id;
  syncCaptures();
  return capture.id;
}

function syncCaptures() {
  updateState({
    captures: Array.from(capturesById.values()),
  });
}

function updateCapture(captureId: string, partial: Partial<ShaderCapture>) {
  const current = capturesById.get(captureId);
  if (!current) return;

  const nextCapture = {
    ...current,
    ...partial,
  };
  capturesById.set(captureId, nextCapture);
  syncCaptures();
}

function captureShaderSource(captureId: string, shader: any) {
  queueMicrotask(() => {
    try {
      if (
        shader?.shaderType === 'compute' &&
        typeof shader?.computeSrc === 'function'
      ) {
        updateCapture(captureId, { shaderSource: shader.computeSrc() ?? '' });
        activeCaptureId = null;
        return;
      }

      const sections: string[] = [];
      if (typeof shader?.vertSrc === 'function') {
        sections.push(`// Vertex\n${shader.vertSrc()}`);
      }
      if (typeof shader?.fragSrc === 'function') {
        sections.push(`// Fragment\n${shader.fragSrc()}`);
      }
      if (sections.length > 0) {
        updateCapture(captureId, { shaderSource: sections.join('\n\n') });
      }
      activeCaptureId = null;
    } catch (error) {
      showError(error);
    }
  });
}

function patchShaderBuilders() {
  const p5Ctor = window.p5;
  if (!p5Ctor || hasPatchedShaderBuilders) return;

  for (const kind of SHADER_CAPTURE_KINDS) {
    const methodName: ShaderBuilderMethodName = getShaderBuilderMethodName(kind);
    const original = (p5Ctor as any).prototype?.[methodName];
    if (typeof original !== 'function') continue;
    (p5Ctor as any).prototype[methodName] = function (...args: unknown[]) {
      const callback = args[0];
      const captureId = createCapture(
        kind,
        typeof callback === 'function' && callback.name ? callback.name : methodName
      );
      const shader = original.apply(this, args);
      captureShaderSource(captureId, shader);
      return shader;
    };
  }

  hasPatchedShaderBuilders = true;
}

function executeSketchAsGlobalScript(source: string) {
  const script = document.createElement('script');
  script.textContent = source;
  document.body.appendChild(script);
  script.remove();
}

function resetPreviewState() {
  capturesById.clear();
  captureSequence = 0;
  activeCaptureId = null;
  previewState = {
    captures: [],
    error: '',
    isLoading: false,
  };

  if (errorNode) {
    errorNode.style.display = 'none';
    errorNode.innerHTML = '';
  }

  publishState();
}

function teardownSketch() {
  if (currentSketchInstance?.remove) {
    currentSketchInstance.remove();
  }
  currentSketchInstance = null;

  if (canvasHost) {
    canvasHost.innerHTML = '';
  }

  delete window.setup;
  delete window.draw;
  delete window.preload;
  delete window.defaultCanvas0;
}

function boot(sourceCode: string) {
  lastBootedSource = sourceCode;
  resetPreviewState();
  teardownSketch();
  patchShaderBuilders();
  executeSketchAsGlobalScript(sourceCode);

  const hasGlobalSketch =
    typeof window.setup === 'function' ||
    typeof window.draw === 'function' ||
    typeof window.preload === 'function';

  if (!hasGlobalSketch || !window.p5) {
    return;
  }

  const globalP5 = window.p5 as typeof window.p5 & {
    instance?: { remove?: () => void } | null;
  };

  if (globalP5.instance) {
    globalP5.instance.remove?.();
    globalP5.instance = null;
  }

  const sketchInstance = new window.p5();
  currentSketchInstance = sketchInstance;

  requestAnimationFrame(() => {
    if (!canvasHost) return;
    if (sketchInstance?.canvas) {
      canvasHost.appendChild(sketchInstance.canvas);
    } else if (window.defaultCanvas0) {
      canvasHost.appendChild(window.defaultCanvas0);
    }
  });
}

function stripSharedIndent(source: string) {
  const lines = source.split('\n');
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  if (nonEmptyLines.length === 0) {
    return source;
  }

  const sharedIndent = Math.min(
    ...nonEmptyLines.map((line) => line.match(/^\s*/)?.[0].length ?? 0)
  );

  if (sharedIndent === 0) {
    return source;
  }

  return lines
    .map((line) => {
      if (line.trim().length === 0) {
        return '';
      }

      return line.slice(sharedIndent);
    })
    .join('\n');
}

window.parent.postMessage(
  { type: RUNNER_READY_MESSAGE_TYPE },
  window.location.origin
);

window.addEventListener('message', (event) => {
  if (event.source !== window.parent) return;
  if (event.origin !== window.location.origin) return;
  if (!isRunnerRunSourceMessage(event.data)) return;
  if (
    event.data.revision === currentRevision &&
    event.data.source === lastBootedSource
  ) {
    return;
  }

  currentRevision = event.data.revision;

  try {
    boot(event.data.source);
  } catch (error) {
    showError(error);
  }
});
