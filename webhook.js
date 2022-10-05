import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';

// Get the SECRET from the .env file
dotenv.config();
const SECRET = process.env.GH_WEBHOOK_SECRET;

const webhookRouter = express.Router();

webhookRouter.use(
	'/',
	// We store the raw buffer because the signature integrity gets lost after parsing
	bodyParser.json({
		verify: (req, res, buf) => {
			req.rawBody = buf;
		},
	}),
	// Verify the signature to know that this is actually from GitHub
	(req, res, next) => {
		try {
			const body = Buffer.from(req.rawBody, 'utf8');
			const ghSign = req.get('x-hub-signature-256'); // GitHub sends the signature in this header
			const ourSign = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
			if (ghSign !== ourSign) {
				throw new Error();
			}
			next();
		} catch (error) {
			res.statusCode = 403;
			return res.send('Who are you?');
		}
	}
);

webhookRouter.post('/', async (req, res) => {
	try {
		const { head_commit: commit, pusher } = req.body;

		if (!commit.message.startsWith('deploy') || pusher.name !== 'abhijit-hota') {
			return res.send('Deployment skipped.');
		}

		const __dirname = path.dirname(fileURLToPath(import.meta.url));

		const commands = [`cd ${__dirname}`, 'git pull --all', 'git checkout main'];
		const changes = [...commit.modified, ...commit.added, ...commit.removed];

		const requiresReinstall = changes.any((change) => change.startsWith('package'));
		if (requiresReinstall) {
			commands.push('npm install');
		}

		const hasFrontendChanges = changes.any((change) => change.startsWith('frontend'));
		if (hasFrontendChanges) {
			commands.push('cd frontend');
			const requiresReinstallInFrontend = changes.any((change) => change.startsWith('frontend/package'));
			if (requiresReinstallInFrontend) {
				commands.push('npm install');
			}
			commands.push('npm run build');
		}
		commands.push('npm start');

		const cmd = commands.join(' && ');
		exec(cmd);

		res.send('');
	} catch (error) {
		console.error(error);
		res.statusCode = 500;
		res.send('Check logs');
	}
});

export default webhookRouter;
