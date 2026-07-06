import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITaxiProfile extends Document {
  userId: Types.ObjectId;
  taxiNumber: string;
  matricule: string;
  currentLocation: {
    type: 'Point';
    coordinates: [number, number];
  };
  isOnline: boolean;
  isAvailable: boolean;
  averageRating: number;
  totalReviews: number;
}

const TaxiProfileSchema = new Schema<ITaxiProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    taxiNumber: { type: String, required: true, trim: true },
    matricule: { type: String, required: true, trim: true },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    isOnline: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: false },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TaxiProfileSchema.index({ currentLocation: '2dsphere' });
TaxiProfileSchema.index({ isOnline: 1, isAvailable: 1 });

export default (mongoose.models.TaxiProfile ||
  mongoose.model<ITaxiProfile>('TaxiProfile', TaxiProfileSchema)) as mongoose.Model<ITaxiProfile>;
