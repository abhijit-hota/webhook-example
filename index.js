import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import webhookRouter from './webhook.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5103;

// Mount the webhook listener
app.use('/webhook', webhookRouter);

// Serving frontend assets
const indexFile = path.resolve(__dirname, 'frontend', 'dist', 'index.html');
app.use('/assets', express.static(path.resolve(__dirname, 'frontend', 'dist', 'assets')));
app.get('/*', (req, res) => res.sendFile(indexFile));

app.listen(PORT, function () {
	console.info('Example running on Port: ' + PORT);
});
