import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {spawn, ChildProcess} from 'child_process';

let backendProcess: ChildProcess | null = null;

function pythonBackendPlugin(): Plugin {
  return {
    name: 'python-fastapi-backend',
    configureServer() {
      if (!backendProcess) {
        console.log('[FastAPI] Spawning Python uvicorn backend on port 5050...');
        backendProcess = spawn('python3', ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', '5050'], {
          stdio: 'inherit',
        });
        backendProcess.on('error', (err) => {
          console.error('[FastAPI] Backend error:', err);
        });
        backendProcess.on('exit', (code) => {
          console.log('[FastAPI] Backend exited with code', code);
          backendProcess = null;
        });

        const cleanUp = () => {
          if (backendProcess) {
            backendProcess.kill();
            backendProcess = null;
          }
        };
        process.on('exit', cleanUp);
        process.on('SIGINT', cleanUp);
        process.on('SIGTERM', cleanUp);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), pythonBackendPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5050',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
