import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyPrefix = env.VITE_API_PROXY_PREFIX || '/api';
  const proxyTarget = env.VITE_API_PROXY_TARGET || process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000';
  const proxyEnabled = (env.VITE_API_PROXY_ENABLED || 'true').toLowerCase() !== 'false';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5174,
      proxy: proxyEnabled
        ? {
            [proxyPrefix]: {
              target: proxyTarget,
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
    },
  };
});
