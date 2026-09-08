export class Cdp {
  constructor(socket) {
    this.socket = socket; this.serial = 0; this.pending = new Map(); this.listeners = new Map();
    socket.addEventListener('message', event => {
      let message; try { message = JSON.parse(event.data); } catch { return; }
      if (message.id) {
        const entry = this.pending.get(message.id); if (!entry) return;
        this.pending.delete(message.id); clearTimeout(entry.timer);
        if (message.error) entry.reject(new Error(message.error.message)); else entry.resolve(message.result);
      } else for (const handler of this.listeners.get(message.method) ?? []) {
        Promise.resolve().then(() => handler(message.params)).catch(error => this.onError?.(error));
      }
    });
    socket.addEventListener('close', () => {
      for (const entry of this.pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('CDP disconnected')); }
      this.pending.clear(); this.onClose?.();
    });
  }
  static async connect(address, port) {
    const url = new URL(address);
    if (url.protocol !== 'ws:' || url.hostname !== '127.0.0.1' || Number(url.port) !== port) throw new Error('Non-loopback CDP target rejected');
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { socket.close(); reject(new Error('CDP connection timeout')); }, 5000);
      socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, {once:true});
      socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('CDP connection failed')); }, {once:true});
    });
    return new Cdp(socket);
  }
  on(name, handler) { const handlers = this.listeners.get(name) ?? []; handlers.push(handler); this.listeners.set(name, handlers); }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.serial;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 8000);
      this.pending.set(id, {resolve, reject, timer});
      try { this.socket.send(JSON.stringify({id, method, params})); }
      catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
    });
  }
  close() { this.socket.close(); }
}
