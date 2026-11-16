import { AuditLog } from '../../models/audit-log.model';
import { logger } from '../../lib/logger';

export interface AuditInput {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  diff?: unknown;
}

/**
 * Append an audit log entry. Never throws: an audit failure must not roll back
 * a successful business mutation, but it must be visible in the logs.
 */
export async function writeAudit(
  actorId: string | null | undefined,
  action: string,
  entity: string,
  entityId: string,
  diff?: unknown,
): Promise<void> {
  await recordAudit({ actorId, action, entity, entityId, diff });
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await AuditLog.create({
      actorId: input.actorId ?? undefined,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      diff: input.diff ?? undefined,
    });
  } catch (err) {
    logger.error({ err, action: input.action, entity: input.entity, entityId: input.entityId }, 'audit.write_failed');
  }
}

export interface AuditListFilter {
  entity?: string;
  entityId?: string;
  actorId?: string;
  limit?: number;
}

/** Most recent audit entries first. */
export async function listAudit(filter: AuditListFilter = {}): Promise<
  Array<{ id: string; actorId?: string; action: string; entity: string; entityId: string; diff?: unknown; at: Date }>
> {
  const query: Record<string, unknown> = {};
  if (filter.entity) query.entity = filter.entity;
  if (filter.entityId) query.entityId = filter.entityId;
  if (filter.actorId) query.actorId = filter.actorId;
  const limit = Math.min(Math.max(filter.limit ?? 100, 1), 500);
  const rows = await AuditLog.find(query).sort({ at: -1 }).limit(limit).lean();
  return rows.map((r) => ({
    id: r._id.toString(),
    actorId: r.actorId ? r.actorId.toString() : undefined,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    diff: r.diff ?? undefined,
    at: r.at,
  }));
}
