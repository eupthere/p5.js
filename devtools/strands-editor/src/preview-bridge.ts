import { defineProxy } from 'comctx';

export type ShaderCapture = {
  id: string;
  kind: 'compute' | 'filter' | 'material' | 'normal' | 'color' | 'stroke';
  name: string;
  callbackBody: string;
  shaderSource: string;
};

export type PreviewState = {
  captures: ShaderCapture[];
  error: string;
};

export class PreviewBridgeService {
  private state: PreviewState = {
    captures: [],
    error: '',
  };

  private listeners = new Set<(state: PreviewState) => void>();

  async getState() {
    return this.state;
  }

  async onState(callback: (state: PreviewState) => void) {
    this.listeners.add(callback);
    callback(this.state);
  }

  update(partial: Partial<PreviewState>) {
    this.state = {
      ...this.state,
      ...partial,
    };

    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  upsertCapture(capture: ShaderCapture) {
    const existingIndex = this.state.captures.findIndex((item) => item.id === capture.id);
    const captures =
      existingIndex === -1
        ? [...this.state.captures, capture]
        : this.state.captures.map((item, index) => (index === existingIndex ? capture : item));

    this.update({ captures });
  }
}

export const previewBridgeService = new PreviewBridgeService();

export const [providePreviewBridge, injectPreviewBridge] = defineProxy(
  () => previewBridgeService,
  {
    namespace: '__strands-editor-preview__',
  }
);
