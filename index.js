import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import webhookRouter from './webhook.js';

// Express instance
const app = express();

// Mount the webhook listener
app.use('/webhook', webhookRouter);

// Serving frontend assets
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexFile = path.resolve(__dirname, 'frontend', 'dist', 'index.html');
app.use('/assets', express.static(path.resolve(__dirname, 'frontend', 'dist', 'assets')));
app.get('/*', (req, res) => res.sendFile(indexFile));

const PORT = +(process.argv[2] || '5103');
app.listen(PORT, function () {
	console.info('Example running on Port: ' + PORT);
});
