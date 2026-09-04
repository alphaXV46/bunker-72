import { defineConfig } from 'vite';
import { resolve }      from 'path';
import fs                from 'node:fs';

const EDITOR_DATA_PATH = resolve(__dirname, 'src/data/editor/editor-layouts.json');

const readEditorData = () => {
  try {
    return JSON.parse(fs.readFileSync(EDITOR_DATA_PATH, 'utf8'));
  } catch (_) {
    return { version: 1, collision: {}, fog: {}, ui: {} };
  }
};

const isValidEditorData = (value) => Boolean(
  value
  && typeof value === 'object'
  && !Array.isArray(value)
  && value.version === 1
  && value.collision
  && typeof value.collision === 'object'
  && !Array.isArray(value.collision)
  && value.fog
  && typeof value.fog === 'object'
  && !Array.isArray(value.fog)
  && value.ui
  && typeof value.ui === 'object'
  && !Array.isArray(value.ui)
);

const editorDataPlugin = () => ({
  name: 'bunker72-editor-data',
  // Editor saves are runtime data, not source edits that should trigger a
  // browser HMR reload while the developer is positioning a panel.
  handleHotUpdate({ file }) {
    if (resolve(file) === EDITOR_DATA_PATH) return [];
    return undefined;
  },
  configureServer(server) {
    server.middlewares.use('/__bunker72/editor-data', (req, res, next) => {
      if (req.method === 'GET') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(readEditorData()));
        return;
      }

      if (req.method !== 'PUT') {
        next();
        return;
      }

      let body = '';
      let rejected = false;
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        if (rejected) return;
        body += chunk;
        if (body.length > 5 * 1024 * 1024) {
          rejected = true;
          res.statusCode = 413;
          res.end('Editor data terlalu besar.');
          req.destroy();
        }
      });
      req.on('end', () => {
        if (rejected) return;

        try {
          const parsed = JSON.parse(body);
          if (!isValidEditorData(parsed)) throw new Error('Schema editor data tidak valid.');
          fs.mkdirSync(resolve(EDITOR_DATA_PATH, '..'), { recursive: true });
          fs.writeFileSync(EDITOR_DATA_PATH, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: true, file: EDITOR_DATA_PATH }));
        } catch (error) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, error: error.message }));
        }
      });
    });
  },
});

export default defineConfig({
  plugins: [editorDataPlugin()],
  server: {
    port: 3000,
    open: false,
  },
  resolve: {
    alias: {
      // Allows '@/js/constants.js' instead of '../../../js/constants.js'
      '@': resolve(__dirname, 'src'),
    },
  },
});
