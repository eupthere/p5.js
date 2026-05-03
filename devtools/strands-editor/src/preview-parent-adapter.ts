import type { Adapter, OnMessage, SendMessage } from 'comctx'

export default class ParentWindowAdapter implements Adapter {
  constructor(private readonly targetWindow: Window) {}

  sendMessage: SendMessage = (message, transfer) => {
    this.targetWindow.postMessage(message, '*', transfer)
  }

  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => {
      if (event.source !== this.targetWindow) return
      callback(event.data)
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }
}
