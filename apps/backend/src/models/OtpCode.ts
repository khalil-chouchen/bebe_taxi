import mongoose, { Schema, Document } from 'mongoose';

export interface IOtpCode extends Document {
  phone: string;
  code: string;
  expiresAt: Date;
  verified: boolean;
  attempts: number;
}

const OtpCodeSchema = new Schema<IOtpCode>({
  phone: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
});

// Auto-delete expired OTPs
OtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpCodeSchema.index({ phone: 1 });

export default (mongoose.models.OtpCode ||
  mongoose.model<IOtpCode>('OtpCode', OtpCodeSchema)) as mongoose.Model<IOtpCode>;
