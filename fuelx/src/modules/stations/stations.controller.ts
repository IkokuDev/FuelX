import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { sendOk } from '../../lib/response';
import { createStation, listStations, updateStation } from './stations.service';
import { writeAudit } from '../admin/audit.service';

export const listHandler = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, { stations: await listStations() });
});

export const createHandler = asyncHandler(async (req: Request, res: Response) => {
  const station = await createStation(req.body);
  await writeAudit(req.user!.id, 'station.create', 'Station', station.id, station);
  sendOk(res, { station }, 201);
});

export const updateHandler = asyncHandler(async (req: Request, res: Response) => {
  const station = await updateStation(req.params.id, req.body);
  await writeAudit(req.user!.id, 'station.update', 'Station', station.id, station);
  sendOk(res, { station });
});
