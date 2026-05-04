import p5Url from '../../../../lib/p5.js?url';
import p5WebgpuUrl from '../../../../lib/p5.webgpu.js?url';

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

await loadScript(p5Url);
await loadScript(p5WebgpuUrl);
await import('./runnerRuntime');
