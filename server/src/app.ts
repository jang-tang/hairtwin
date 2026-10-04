import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config, isProd } from './config.js';
import { buildRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function buildApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: config.corsOrigin, credentials: false }));
  app.use(express.json({ limit: '12mb' }));
  app.use(morgan(isProd ? 'combined' : 'dev'));
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use('/api', buildRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
