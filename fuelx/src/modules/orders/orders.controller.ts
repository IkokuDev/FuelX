import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { sendOk, sendPaginated } from '../../lib/response';
import {
  cancelOrder,
  createOrder,
  getOrderForViewer,
  listOwnOrders,
} from './orders.service';
import type { CancelOrderInput, CreateOrderInput, ListOrdersQuery } from './orders.schemas';

export const createHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await createOrder(req.user!.id, req.body as CreateOrderInput);
  sendOk(res, result, 201);
});

export const listHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListOrdersQuery;
  const result = await listOwnOrders(req.user!.id, query);
  sendPaginated(res, result.items, { page: result.page, limit: result.limit, total: result.total });
});

export const getHandler = asyncHandler(async (req: Request, res: Response) => {
  const order = await getOrderForViewer(req.params.id, req.user!);
  sendOk(res, order);
});

export const cancelHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CancelOrderInput;
  const order = await cancelOrder(req.params.id, req.user!.id, body.reason);
  sendOk(res, order);
});
