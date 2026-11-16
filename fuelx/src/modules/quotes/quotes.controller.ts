import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { sendOk } from '../../lib/response';
import { createQuote } from './quotes.service';
import type { CreateQuoteInput } from './quotes.schemas';

export const createHandler = asyncHandler(async (req: Request, res: Response) => {
  const quote = await createQuote(req.user!.id, req.body as CreateQuoteInput);
  sendOk(res, quote, 201);
});
