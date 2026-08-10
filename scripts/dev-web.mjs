#!/usr/bin/env node
/**
 * Vite launcher that tolerates an already-running dev server.
 *
 * `tauri dev` runs this as its `beforeDevCommand`. Previously it ran `vite`
 * unconditionally, so starting the desktop app while a preview server was
 * already serving port 1420 failed with EADDRINUSE — and the reverse
 * collided too. The port is not arbitrary: `tauri.conf.json` pins `devUrl`
 * to it and `vite.config.ts` sets `strictPort`, so the fix is to share one
 * server rather than to let the port float.
 *
 * If something is already serving the port, exit 0 and let Tauri attach to
 * it. Otherwise start Vite in the foreground as before.
 */
import { spawn } from 'node:child_process';
import net from 'node:net';

const PORT = Number(process.env.PORT ?? 1420);
/**
 * Both loopback families must be probed: Vite binds `localhost`, which Node
 * 17+ resolves to IPv6 first, so a v4-only probe reports a busy port as free.
 */
const HOSTS = ['127.0.0.1', '::1'];

/** Resolves true when something is accepting connections on the port. */
function portInUse(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(1000);
    socket.once('connect', () => {
      done(true);
    });
    socket.once('timeout', () => {
      done(false);
    });
    socket.once('error', () => {
      done(false);
    });
  });
}

const results = await Promise.all(HOSTS.map((host) => portInUse(PORT, host)));
if (results.some(Boolean)) {
  console.log(`[dev-web] reusing dev server already on http://localhost:${PORT}`);
  process.exit(0);
}

// Invoke the platform binary directly rather than through a shell, so no
// argument concatenation happens.
const vite = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite'], {
  stdio: 'inherit',
});

vite.on('exit', (code, signal) => {
  process.exit(signal ? 1 : (code ?? 0));
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    vite.kill(sig);
  });
}
