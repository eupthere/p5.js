import {
  previewBridgeService,
  providePreviewBridge,
} from './bridge';
import PreviewFrameAdapter from './frameAdapter';
import {
  PREVIEW_READY_MESSAGE_TYPE,
  isPreviewSourceMessage,
  isRunnerReadyMessage,
  isRunnerStateUpdateMessage,
  RUNNER_RUN_SOURCE_MESSAGE_TYPE,
} from './messages';
import type { ShaderCapture } from './types';

const service = previewBridgeService;
providePreviewBridge(new PreviewFrameAdapter());

const runnerHost = document.getElementById('runner-host');
const errorNode = document.getElementById('error');

let currentRevision = 0;
let currentSource = '';
let currentRunnerIframe: HTMLIFrameElement | null = null;

window.parent.postMessage(
  { type: PREVIEW_READY_MESSAGE_TYPE },
  window.location.origin
);

function showShellError(message: string) {
  if (errorNode) {
    errorNode.style.display = 'block';
    errorNode.innerHTML = `<pre>${message}</pre>`;
  }
}

function hideShellError() {
  if (errorNode) {
    errorNode.style.display = 'none';
    errorNode.innerHTML = '';
  }
}

function applyRunnerState(error: string, captures: ShaderCapture[]) {
  service.update({
    error,
    captures,
  });

  if (error.trim()) {
    showShellError(error);
  } else {
    hideShellError();
  }
}

function resetRunnerState() {
  applyRunnerState('', []);
}

function sendSourceToRunner() {
  if (!currentRunnerIframe?.contentWindow) return;

  currentRunnerIframe.contentWindow.postMessage(
    {
      type: RUNNER_RUN_SOURCE_MESSAGE_TYPE,
      revision: currentRevision,
      source: currentSource,
    },
    window.location.origin
  );
}

function mountRunnerFrame() {
  if (!runnerHost) return;

  const runnerIframe = document.createElement('iframe');
  runnerIframe.title = 'Sketch runner';
  runnerIframe.className = 'h-full w-full border-0 bg-white';
  runnerIframe.sandbox.add('allow-scripts');
  runnerIframe.sandbox.add('allow-same-origin');
  runnerIframe.src = '/runner.html';

  runnerHost.innerHTML = '';
  runnerHost.appendChild(runnerIframe);
  currentRunnerIframe = runnerIframe;
}

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;

  if (event.source === window.parent && isPreviewSourceMessage(event.data)) {
    currentRevision += 1;
    currentSource = event.data.source;
    resetRunnerState();
    mountRunnerFrame();
    return;
  }

  if (event.source !== currentRunnerIframe?.contentWindow) return;

  if (isRunnerReadyMessage(event.data)) {
    sendSourceToRunner();
    return;
  }

  if (isRunnerStateUpdateMessage(event.data)) {
    if (event.data.revision !== currentRevision) return;
    applyRunnerState(event.data.state.error, event.data.state.captures);
  }
});
