import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';
import { metricsMiddleware } from './utils/monitor.js';
import tasksRouter from './routes/tasks.js';
import sprintsRouter from './routes/sprints.js';
import agentsRouter from './routes/agents.js';
import prdRouter from './routes/prd.js';
import generateTasksRouter from './routes/generate-tasks.js';
import statusRouter from './routes/status.js';
import mcpRouter from './routes/mcp.js';
import cliRouter from './routes/cli.js';
import sanitizeInputs from './middleware/sanitize.js';
import errorHandler from './middleware/error-handler.js';
import rateLimiter from './middleware/rate-limit.js';
import authenticate from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
	app.use(helmet());
	app.set('trust proxy', 1);
}

// Middleware

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(metricsMiddleware);
if (process.env.NODE_ENV === 'production') {
	app.use(rateLimiter);
	app.use(csrf({ cookie: true }));
	app.use(authenticate);
}
app.use(sanitizeInputs);
app.use((req, _res, next) => {
	logger.info(`${req.method} ${req.url}`);
	next();
});
const staticDir = isProd
	? path.join(__dirname, '../dist/public')
	: path.join(__dirname, '../ui/public');
app.use(express.static(staticDir));
app.use('/api/tasks', tasksRouter);
app.use('/api/prd', prdRouter);
app.use('/api/generate-tasks', generateTasksRouter);
app.use('/api/agents', agentsRouter);

app.use('/api/mcp', mcpRouter);
app.use('/api/cli', cliRouter);
app.use('/api', statusRouter);
app.get('/api/uptime', (_req, res) => {
	res.json({ uptime: process.uptime() });
});

// Legacy health check route
app.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

// 404 handler
app.use((_req, res) => {
	res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
	if (err.code === 'EBADCSRFTOKEN') {
		res.status(403).json({ error: 'Invalid CSRF token' });
		return;
	}
	next(err);
});

app.use(errorHandler);

export default app;
