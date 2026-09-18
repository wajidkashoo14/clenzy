import { Schema, model } from 'mongoose';

/**
 * See docs/DATABASE.md "refreshTokens" and docs/SECURITY.md §1 "Rotation
 * with reuse detection" — each refresh issues a new token in the same
 * `family` and consumes (revokes) the old one. Presenting an already-revoked
 * token is the signal of a stolen token: the whole family gets revoked.
 */
export interface RefreshTokenDocument {
  userId: Schema.Types.ObjectId;
  tokenHash: string;
  family: string;
  userAgent?: string;
  ip?: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true },
    userAgent: { type: String },
    ip: { type: String },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// `tokenHash` already gets a unique index from `unique: true` on the field above.
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ family: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model<RefreshTokenDocument>('RefreshToken', refreshTokenSchema);
