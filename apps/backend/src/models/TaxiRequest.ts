import mongoose, { Schema, Document, Types } from 'mongoose';

export type RequestStatus = 'searching' | 'accepted' | 'cancelled' | 'completed';

export interface ITaxiRequest extends Document {
  clientId: Types.ObjectId;
  clientLocation: {
    type: 'Point';
    coordinates: [number, number];
  };
  status: RequestStatus;
  acceptedTaxiId?: Types.ObjectId;
  createdAt: Date;
  expiresAt: Date;
}

const TaxiRequestSchema = new Schema<ITaxiRequest>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clientLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: { type: [Number], required: true },
    },
    status: {
      type: String,
      enum: ['searching', 'accepted', 'cancelled', 'completed'],
      default: 'searching',
    },
    acceptedTaxiId: { type: Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

TaxiRequestSchema.index({ clientLocation: '2dsphere' });
TaxiRequestSchema.index({ status: 1, expiresAt: 1 });
TaxiRequestSchema.index({ clientId: 1, status: 1 });

export default (mongoose.models.TaxiRequest ||
  mongoose.model<ITaxiRequest>('TaxiRequest', TaxiRequestSchema)) as mongoose.Model<ITaxiRequest>;
