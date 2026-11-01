(function (exports) {
  'use strict';
  const addr = (y, x = 0) => (y & 7) * 1024 + ((y >> 3) & 7) * 128 + (y >> 6) * 40 + x;
  const bytes = s => Uint8Array.from(typeof Buffer === 'function' ? Buffer.from(s, 'base64') : atob(s), v => typeof v === 'number' ? v : v.charCodeAt(0));
  class Pedro {
    constructor(data, page) {
      this.data = data; this.background = Uint8Array.from(page, v => v === 128 ? 0 : v);
      this.page = this.background.slice(); this.state = data.initial.slice();
      this.sprites = data.sprites.map(s => ({...s, bytes: bytes(s.bytes)}));
      this.font = Object.fromEntries(Object.entries(data.font).map(([c, s]) => [c, bytes(s)]));
      this.seed = data.seed; this.used = Array(36).fill(0); this.maxGap = 6; this.hold = 30;
      this.message = null; this.exited = false; this.tickNumber = 0;
    }
    get(a) { return this.state[a - 0x8291]; }
    set(a, v) { this.state[a - 0x8291] = v & 255; }
    random(low, high) {
      this.seed = (this.seed * 8192) % 0x03ffdb9b;
      return low + Math.floor(this.seed / 0x03ffdb9b * (high - low + 1));
    }
    draw() {
      for (let i = 3; i >= 0; i--) {
        const frame = this.get(0x82a0 + i); if (frame & 128) continue;
        const sprite = this.sprites[frame], x = this.get(0x82a4 + i), y = this.get(0x82a8 + i);
        for (let dy = 0; dy < sprite.height; dy++) for (let dx = 0; dx < sprite.width; dx++) {
          const xx = (x + dx) & 255, yy = (y + dy) & 255;
          if (xx >= 40 || yy >= 192) continue;
          const at = addr(yy, xx), value = sprite.bytes[dy * sprite.width + dx];
          if (i === 3 && this.get(0x829a)) this.page[at] = this.background[at];
          else if (value !== 0 && value !== 128) this.page[at] = i === 3 ? this.page[at] | value : value;
        }
      }
    }
    text(id) {
      this.message = id;
      this.data.dialogues[id].lines.forEach((line, row) => {
        let x = this.data.lineColumns[row] + (((this.data.lineWidths[row] - (line.length - 1)) & 255) >> 1);
        for (const char of line) {
          const glyph = this.font[char];
          if (glyph) for (let dy = 0; dy < 8; dy++) this.page[addr(15 + row * 8 + dy, x)] = (this.page[addr(15 + row * 8 + dy, x)] ^ glyph[dy]) & 127;
          x++;
        }
      });
    }
    open() { this.set(0x82a3, this.get(0x82a3) - 128); this.set(0x8299, this.get(0x8299) + 1); }
    close() { this.set(0x829a, this.get(0x829a) + 1); this.set(0x82a3, 11); this.message = null; }
    chooseJoke() {
      let id = this.random(4, 35);
      if (this.used[id]) {
        let next = id + 1;
        while (next <= 35 && this.used[next]) next++;
        if (next <= 35) id = next;
        else {
          next = id - 1; while (next >= 4 && this.used[next]) next--;
          if (next >= 4) id = next; else this.used.fill(0);
        }
      }
      this.used[id]++; return id;
    }
    dialogue() {
      let stage = this.get(0x8296), id;
      if (stage === 3) { stage = 128; this.set(0x8296, stage); }
      if (stage & 128) { this.hold = 47; this.maxGap = 47; id = this.chooseJoke(); }
      else {
        this.hold = 30; this.maxGap = 9;
        if (stage === 2) { this.maxGap = 20; this.set(0x8295, 1); }
        id = stage; this.set(0x8296, stage + 1);
      }
      this.text(id);
    }
    timers() {
      if (this.get(0x8295) || this.get(0x8294)) return;
      if (this.get(0x8299)) { this.set(0x82a3, 139); this.set(0x8299, 0); this.dialogue(); }
      else if (this.get(0x829a)) { this.set(0x829a, 0); this.set(0x82a3, 139); }
      if (this.get(0x8298)) {
        this.set(0x8298, this.get(0x8298) - 1); if (!this.get(0x8298)) this.close(); return;
      }
      this.set(0x8297, this.get(0x8297) - 1);
      if (this.get(0x8297) & 128) { this.set(0x8297, this.random(4, this.maxGap)); this.set(0x8298, this.hold); this.open(); }
    }
    step(key = '') {
      if (this.exited) return;
      this.tickNumber++;
      key = key.toUpperCase();
      if (key) {
        let accept = false;
        if (this.get(0x8295)) { this.set(0x8295, 0); accept = key === 'S'; }
        if (!accept && !this.get(0x8294)) {
          this.open(); this.draw(); this.set(0x82a3, 139); this.text(3); this.set(0x8294, 1); return;
        }
        if (!accept && key === 'Y') { this.exited = true; return; }
        this.set(0x8294, 0); this.set(0x8299, 0); this.close(); this.draw();
        this.set(0x82a3, 139); this.set(0x829a, 0); this.set(0x8298, 0); this.set(0x8297, 3);
        this.maxGap = 6; this.hold = 30;
      }
      this.random(1, 254); // The original consumes this otherwise unused value.
      this.set(0x82a0, (this.get(0x82a0) + 1) % 4);
      let frame = this.get(0x82a1) + 1; this.set(0x82a1, frame >= 7 ? 4 : frame);
      if (this.get(0x8291) >= 2) {
        this.set(0x8293, this.get(0x8293) - 1);
        if (this.get(0x8293) & 128) {
          this.set(0x8293, this.random(3, 7)); this.set(0x8292, this.random(0, 3)); this.set(0x8291, 0);
        }
      }
      if (this.get(0x8291) < 2) {
        this.set(0x82a2, this.data.poses[this.get(0x8292) * 2 + this.get(0x8291)]);
        this.set(0x8291, this.get(0x8291) + 1);
      }
      this.timers(); this.draw();
    }
    get prompt() { return this.exited ? 'shop' : this.get(0x8294) ? 'confirm-shop' : this.get(0x8295) ? 'joke' : 'talking'; }
  }
  exports.Pedro = Pedro;
})(typeof module === 'object' ? module.exports : (globalThis.AmazonPedro = {}));
