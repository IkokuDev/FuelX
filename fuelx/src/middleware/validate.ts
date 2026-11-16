import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError } from '../lib/errors';

type Source = 'body' | 'query' | 'params';

function flatten(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    out[issue.path.join('.') || '(root)'] = issue.message;
  }
  return out;
}

/**
 * Validate one request source with a Zod schema and replace it with the parsed value.
 * `.strict()` schemas reject unknown keys before they ever reach MongoDB.
 */
export function validate(source: Source, schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(new AppError('VALIDATION_ERROR', 400, 'Invalid request', flatten(result.error)));
      return;
    }
    if (source === 'query') {
      // Express 4 exposes req.query through a getter, so redefine it as a data property.
      Object.defineProperty(req, 'query', {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      req[source] = result.data;
    }
    next();
  };
}
