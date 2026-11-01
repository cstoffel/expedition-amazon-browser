(function (exports) {
  'use strict';
  function address(y, x = 0) {
    return (y & 7) * 1024 + ((y >> 3) & 7) * 128 + (y >> 6) * 40 + x;
  }
  function decode(raw, format) {
    const out = new Uint8Array(8192);
    let pos = 0, remaining = 0, value = 0;
    function read() {
      if (pos >= raw.length) throw new Error('Truncated packed image');
      return raw[pos++];
    }
    if (format === 'unpack') {
      const marker = read();
      for (let x = 0; x < 40; x++) for (let y = 0; y < 192; y++) {
        if (!remaining) {
          value = read();
          if (value === marker) { remaining = read() || 256; value = read(); }
          else remaining = 1;
        }
        out[address(y, x)] = value; remaining--;
      }
    } else if (format === 'pac') {
      const height = read(), width = read() + 1;
      if (!height || height > 192 || height % 2 || width > 40) throw new Error('Unsupported PAC rectangle');
      for (const parity of [1, 0]) for (let x = 0; x < width; x++) for (let y = parity; y < height; y += 2) {
        if (!remaining) {
          value = read();
          if (value === 0) { remaining = read() || 256; value = read(); }
          else remaining = 1;
        }
        out[address(y, x)] = value; remaining--;
      }
    } else throw new Error('Unknown format');
    return {page: out, consumed: pos};
  }
  function composite(page, background, sprite, mask, width, height, x, y, mode) {
    for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < width; dx++) {
      const yy = (y + dy) & 255, xx = (x + dx) & 255;
      if (xx >= 40 || yy >= 192) continue;
      const dest = address(yy, xx), n = dy * width + dx;
      page[dest] = mode === 'restore' ? background[dest] : mode === 'copy' ? sprite[n] : (background[dest] & mask[n]) | sprite[n];
    }
    return page;
  }
  function pixels(page, mono = false) {
    const rgba = new Uint8ClampedArray(280 * 192 * 4);
    const colors = [[[205, 80, 220], [80, 220, 80]], [[55, 145, 255], [255, 105, 45]]];
    for (let y = 0; y < 192; y++) {
      const bits = Array.from({length: 280}, (_, x) => (page[address(y, Math.floor(x / 7))] >> (x % 7)) & 1);
      for (let x = 0; x < 280; x++) {
        const i = (y * 280 + x) * 4; rgba[i + 3] = 255;
        if (!bits[x]) continue;
        const adjacent = (x > 0 && bits[x - 1]) || (x < 279 && bits[x + 1]);
        const color = mono || adjacent ? [255, 255, 255] : colors[page[address(y, Math.floor(x / 7))] >> 7][x % 2];
        rgba.set(color, i);
      }
    }
    return rgba;
  }
  Object.assign(exports, {address, decode, composite, pixels});
})(typeof module === 'object' ? module.exports : (globalThis.AmazonGraphics = {}));
