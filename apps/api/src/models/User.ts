import type { Role } from '@clenzy/shared';
import { ROLES } from '@clenzy/shared';
import { Schema, model, type Types } from 'mongoose';

/** See docs/DATABASE.md "staff — not a separate collection": agents are users with an embedded profile. */
export interface StaffProfile {
  employeeId?: string;
  assignedAreas: Types.ObjectId[];
  vehicleNumber?: string;
  isAvailable: boolean;
  shiftStart?: string;
  shiftEnd?: string;
  joinedAt?: Date;
}

/** See docs/DATABASE.md "users". */
export interface UserDocument {
  phone: string;
  phoneVerified: boolean;
  email?: string;
  emailVerified: boolean;
  passwordHash?: string;
  name?: string;
  role: Role;
  status: 'active' | 'suspended' | 'deleted';
  /** Only meaningful for `role: 'agent'`. */
  staffProfile?: StaffProfile;
  notificationPrefs: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    push: boolean;
    marketing: boolean;
  };
  stats: { orderCount: number; totalSpent: number; lastOrderAt?: Date };
  /**
   * Not in docs/DATABASE.md's table but required by docs/SECURITY.md §1
   * ("Account lockout after 10 failed attempts in 15 minutes, with
   * exponential backoff") — email/password login only, so phone-OTP users
   * never touch these fields.
   */
  loginAttempts: number;
  lockedUntil?: Date;
  /**
   * Not in docs/DATABASE.md's table either, for the same reason as
   * `loginAttempts` above — docs/SECURITY.md §1 requires "single-use token,
   * hashed at rest, 30-minute expiry" for password reset, which needs
   * somewhere durable to live. Stored on the user rather than a separate
   * collection since exactly one reset can be pending at a time.
   */
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  lastLoginAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    phoneVerified: { type: Boolean, default: false },
    email: { type: String, trim: true, lowercase: true },
    emailVerified: { type: Boolean, default: false },
    // select: false — never returned by a default find/findOne; see docs/SECURITY.md §1.
    passwordHash: { type: String, select: false },
    name: { type: String, trim: true, maxlength: 100 },
    role: { type: String, enum: ROLES, default: 'customer' },
    status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },
    staffProfile: {
      employeeId: { type: String, trim: true },
      assignedAreas: [{ type: Schema.Types.ObjectId, ref: 'ServiceArea' }],
      vehicleNumber: { type: String, trim: true },
      isAvailable: { type: Boolean, default: true },
      shiftStart: { type: String },
      shiftEnd: { type: String },
      joinedAt: { type: Date },
    },
    notificationPrefs: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
    },
    stats: {
      orderCount: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      lastOrderAt: { type: Date },
    },
    loginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date },
    lastLoginAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

// `phone` already gets a unique index from `unique: true` on the field above.
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, status: 1 });

export const User = model<UserDocument>('User', userSchema);
