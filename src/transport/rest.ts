import { Router, type Response } from 'express';
import { AppError, type HubService } from '../domain/index.js';

const STATUS: Record<string, number> = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  FORBIDDEN: 403,
  VALIDATION: 400,
};

function send(res: Response, fn: () => unknown): void {
  try {
    res.json(fn());
  } catch (error) {
    if (error instanceof AppError) {
      res.status(STATUS[error.code] ?? 500).json({ error: { code: error.code, message: error.message } });
    } else {
      res.status(500).json({ error: { code: 'INTERNAL', message: 'Request failed.' } });
    }
  }
}

/**
 * A thin REST façade over {@link HubService} for the browser test UI. Each route maps
 * 1:1 onto a service operation; this layer holds no logic of its own.
 */
export function createRestRouter(service: HubService): Router {
  const router = Router();

  router.post('/rooms', (req, res) => send(res, () => service.createRoom(req.body)));
  router.post('/resolve', (req, res) => send(res, () => service.resolveLink(req.body.token)));
  router.post('/join', (req, res) => send(res, () => service.join(req.body.token)));
  router.post('/post', (req, res) =>
    send(res, () => service.post(req.body.token, req.body.act, req.body.payload)),
  );
  router.post('/status', (req, res) =>
    send(res, () => {
      service.setStatus(req.body.token, req.body.status);
      return { ok: true };
    }),
  );
  router.post('/read', (req, res) => send(res, () => service.readRoom(req.body.token, req.body.since)));
  router.post('/state', (req, res) => send(res, () => service.myState(req.body.token)));
  router.post('/snapshot', (req, res) => send(res, () => service.roomSnapshot(req.body.token)));
  router.post('/summary', (req, res) =>
    send(res, () => {
      service.updateSummary(req.body.token, req.body.summary);
      return { ok: true };
    }),
  );
  router.post('/declare', (req, res) => send(res, () => service.declare(req.body.token, req.body.outcome)));
  router.post('/doc', (req, res) => send(res, () => service.readDoc(req.body.token)));

  return router;
}
