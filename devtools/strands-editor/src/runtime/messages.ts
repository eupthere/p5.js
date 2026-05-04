import type { PreviewState } from './types';

export const PREVIEW_SOURCE_MESSAGE_TYPE = '__strands-editor-source__';
export const PREVIEW_READY_MESSAGE_TYPE = '__strands-editor-ready__';
export const RUNNER_READY_MESSAGE_TYPE = '__strands-editor-runner-ready__';
export const RUNNER_RUN_SOURCE_MESSAGE_TYPE = '__strands-editor-runner-run-source__';
export const RUNNER_STATE_UPDATE_MESSAGE_TYPE =
  '__strands-editor-runner-state-update__';

export type PreviewSourceMessage = {
  type: typeof PREVIEW_SOURCE_MESSAGE_TYPE;
  source: string;
};

export type PreviewReadyMessage = {
  type: typeof PREVIEW_READY_MESSAGE_TYPE;
};

export type RunnerReadyMessage = {
  type: typeof RUNNER_READY_MESSAGE_TYPE;
};

export type RunnerRunSourceMessage = {
  type: typeof RUNNER_RUN_SOURCE_MESSAGE_TYPE;
  revision: number;
  source: string;
};

export type RunnerStateUpdateMessage = {
  type: typeof RUNNER_STATE_UPDATE_MESSAGE_TYPE;
  revision: number;
  state: PreviewState;
};

export function isPreviewSourceMessage(
  value: unknown
): value is PreviewSourceMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'source' in value &&
    (value as { type?: unknown }).type === PREVIEW_SOURCE_MESSAGE_TYPE &&
    typeof (value as { source?: unknown }).source === 'string'
  );
}

export function isPreviewReadyMessage(
  value: unknown
): value is PreviewReadyMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as { type?: unknown }).type === PREVIEW_READY_MESSAGE_TYPE
  );
}

export function isRunnerReadyMessage(
  value: unknown
): value is RunnerReadyMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as { type?: unknown }).type === RUNNER_READY_MESSAGE_TYPE
  );
}

export function isRunnerRunSourceMessage(
  value: unknown
): value is RunnerRunSourceMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'revision' in value &&
    'source' in value &&
    (value as { type?: unknown }).type === RUNNER_RUN_SOURCE_MESSAGE_TYPE &&
    typeof (value as { revision?: unknown }).revision === 'number' &&
    typeof (value as { source?: unknown }).source === 'string'
  );
}

export function isRunnerStateUpdateMessage(
  value: unknown
): value is RunnerStateUpdateMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'revision' in value &&
    'state' in value &&
    (value as { type?: unknown }).type === RUNNER_STATE_UPDATE_MESSAGE_TYPE &&
    typeof (value as { revision?: unknown }).revision === 'number' &&
    typeof (value as { state?: unknown }).state === 'object' &&
    (value as { state?: unknown }).state !== null
  );
}
