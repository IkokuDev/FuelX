import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, required: true },
    diff: { type: Schema.Types.Mixed },
    at: { type: Date, default: Date.now, required: true },
  },
  { timestamps: true },
);

auditLogSchema.index({ entity: 1, entityId: 1, at: -1 });
auditLogSchema.index({ actorId: 1, at: -1 });

export type AuditLogSchemaType = InferSchemaType<typeof auditLogSchema>;
export type AuditLogDoc = HydratedDocument<AuditLogSchemaType>;

export const AuditLog = model('AuditLog', auditLogSchema);
