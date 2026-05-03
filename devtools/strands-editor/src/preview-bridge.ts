import { defineProxy } from 'comctx'

export type PreviewState = {
  internalCallback: string
  shaderSource: string
  error: string
}

export class PreviewBridgeService {
  private state: PreviewState = {
    internalCallback: '',
    shaderSource: '',
    error: '',
  }

  private listeners = new Set<(state: PreviewState) => void>()

  async getState() {
    return this.state
  }

  async onState(callback: (state: PreviewState) => void) {
    this.listeners.add(callback)
    callback(this.state)
  }

  update(partial: Partial<PreviewState>) {
    this.state = {
      ...this.state,
      ...partial,
    }

    for (const listener of this.listeners) {
      listener(this.state)
    }
  }
}

export const previewBridgeService = new PreviewBridgeService()

export const [providePreviewBridge, injectPreviewBridge] = defineProxy(
  () => previewBridgeService,
  {
    namespace: '__strands-editor-preview__',
  }
)
