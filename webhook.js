import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';

import crypto from 'node:crypto';
import { exec } from 'node:child_process';

dotenv.config();
const SECRET = process.env.GH_WEBHOOK_SECRET;

const webhookRouter = express.Router();

webhookRouter.use(
	'/',
	bodyParser.json({
		verify: (req, res, buf) => {
			req.rawBody = buf;
		},
	}),
	(req, res, next) => {
		try {
			const body = Buffer.from(req.rawBody, 'utf8');
			const ghSign = req.headers['x-hub-signature-256'];
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
		const { head_commit: commit, repository } = req.body;
		if (commit.message.startsWith('deploy')) {
			const repo = repository.name.replace('internfair-', '');
			const requiresInstall = commit.modified.includes('package.json');
			const isFrontend = repo !== 'backend';
			const cmd = `cd ${repo} && git pull --all ${requiresInstall ? '&& npm i ' : ''} ${
				isFrontend ? '&& npm run build' : ''
			} && pm2 restart internfair${isFrontend ? '' : '-api && pm2 restart internfair-admin-api'}`;

			exec(cmd);

			res.send('Deployed');
		} else {
			res.send('Deployment skipped.');
		}
	} catch (error) {
		console.error(error);
		res.statusCode = 500;
		res.send('Check logs');
	}
});

export default webhookRouter;
