import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { sendOk } from '../../lib/response';
import { getGeocodeProvider } from '../../providers/geocode';
import type { GeoSearchQuery, GeoReverseQuery } from './geo.schemas';

export const searchHandler = asyncHandler(async (req: Request, res: Response) => {
  const { q, limit } = req.query as unknown as GeoSearchQuery;
  const provider = getGeocodeProvider();
  const results = provider.available ? await provider.search(q, limit ?? 5) : [];
  sendOk(res, { results, provider: provider.name });
});

export const reverseHandler = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng } = req.query as unknown as GeoReverseQuery;
  const provider = getGeocodeProvider();
  const result = provider.available ? await provider.reverse(lat, lng) : null;
  sendOk(res, { result, provider: provider.name });
});
