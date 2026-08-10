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
 *
 * Tauri invokes this indirectly, as `npm run dev:vite` from `apps/desktop`.
 * The indirection is deliberate: Tauri's working directory for
 * `beforeDevCommand` has moved between versions, so a path relative to it
 * silently breaks on upgrade, while npm always runs a script from its own
 * package directory. Vite is spawned in that directory and needs it to find
 * its config.
 */
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

/**
 * Start Vite through its Node API rather than as a child process.
 *
 * The obvious `spawn('npx', ['vite'])` does not work here. On Windows that
 * resolves to `npx.cmd`, and Node 22+ refuses to spawn `.cmd` shims without
 * `shell: true` — the fix for CVE-2024-27980 — while turning the shell on
 * would reintroduce exactly the argument-quoting hazard that change closed.
 * Spawning Vite's bin entry directly is no better: Vite 7 does not expose it
 * through package `exports`. The Node API is the supported surface, needs no
 * child process at all, and reads the config from the working directory the
 * same way the CLI does.
 */
const { createServer } = await import('vite');

const server = await createServer();
await server.listen();
server.printUrls();

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    void server.close().then(() => {
      process.exit(0);
    });
  });
}
