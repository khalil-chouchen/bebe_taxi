import mongoose, { Schema, Document, Types } from 'mongoose';

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface ITaxiOffer extends Document {
  requestId: Types.ObjectId;
  taxiId: Types.ObjectId;
  distanceKm: number;
  etaMinutes: number;
  status: OfferStatus;
  createdAt: Date;
}

const TaxiOfferSchema = new Schema<ITaxiOffer>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'TaxiRequest', required: true },
    taxiId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    distanceKm: { type: Number, required: true, min: 0 },
    etaMinutes: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

TaxiOfferSchema.index({ requestId: 1, status: 1 });
TaxiOfferSchema.index({ taxiId: 1, status: 1 });
// Prevent same taxi from offering twice on same request
TaxiOfferSchema.index({ requestId: 1, taxiId: 1 }, { unique: true });

export default mongoose.models.TaxiOffer ||
  mongoose.model<ITaxiOffer>('TaxiOffer', TaxiOfferSchema);
