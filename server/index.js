import express from 'express';
import http from 'node:http';
import cors from 'cors';
import { Server } from 'socket.io';
import { config } from './config/env.js';
import { webhookRouter } from './routes/webhookRoutes.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { setSocketIo } from './controllers/webhookController.js';

const app = express();

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
  },
});

setSocketIo(io);

io.on('connection', socket => {
  socket.on('disconnect', () => {
  });
});

app.use('/webhook', webhookRouter);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    env: config.nodeEnv,
    domain: config.backendDomain,
  });
});

app.use(notFound);
app.use(errorHandler);

const port = config.port;

server.listen(port, () => {
  console.log(`Webhook bridge listening on http://localhost:${port}`);
});
