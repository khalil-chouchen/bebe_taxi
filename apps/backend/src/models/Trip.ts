import mongoose, { Schema, Document, Types } from 'mongoose';

export type TripStatus = 'accepted' | 'arriving' | 'arrived' | 'completed' | 'cancelled';

export interface ITrip extends Document {
  requestId: Types.ObjectId;
  clientId: Types.ObjectId;
  taxiId: Types.ObjectId;
  startLocation: {
    type: 'Point';
    coordinates: [number, number];
  };
  taxiStartLocation: {
    type: 'Point';
    coordinates: [number, number];
  };
  status: TripStatus;
  acceptedAt: Date;
  arrivedAt?: Date;
  completedAt?: Date;
}

const TripSchema = new Schema<ITrip>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'TaxiRequest', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    taxiId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    taxiStartLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    status: {
      type: String,
      enum: ['accepted', 'arriving', 'arrived', 'completed', 'cancelled'],
      default: 'accepted',
    },
    acceptedAt: { type: Date, required: true, default: Date.now },
    arrivedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

TripSchema.index({ clientId: 1, status: 1 });
TripSchema.index({ taxiId: 1, status: 1 });
TripSchema.index({ requestId: 1 }, { unique: true });

export default (mongoose.models.Trip || mongoose.model<ITrip>('Trip', TripSchema)) as mongoose.Model<ITrip>;
