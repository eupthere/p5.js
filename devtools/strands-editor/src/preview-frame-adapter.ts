import type { Adapter, OnMessage, SendMessage } from 'comctx';

export default class PreviewFrameAdapter implements Adapter {
  sendMessage: SendMessage = (message, transfer) => {
    window.parent.postMessage(message, '*', transfer);
  };

  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      callback(event.data);
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  };
}
