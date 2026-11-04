declare module '*.ttf?inline' {
  const dataUrl: string;
  export default dataUrl;
}

declare module 'qrcode/lib/server.js' {
  import type { toBuffer } from 'qrcode';

  const qr: { toBuffer: typeof toBuffer };
  export default qr;
}
