// Polyfill for Node.js global in browser environments
// This is needed for AWS SDK to work in the browser
if (typeof window !== 'undefined' && typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

// Other Node.js core modules that AWS SDK might expect
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

if (typeof (window as any).Buffer === 'undefined') {
  (window as any).Buffer = {
    isBuffer: () => false,
    from: (data: any) => new Uint8Array(data),
  };
}
