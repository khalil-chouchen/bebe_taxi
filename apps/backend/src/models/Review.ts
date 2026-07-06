import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReview extends Document {
  tripId: Types.ObjectId;
  clientId: Types.ObjectId;
  taxiId: Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, unique: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    taxiId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

ReviewSchema.index({ taxiId: 1 });
ReviewSchema.index({ clientId: 1 });

export default (mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema)) as mongoose.Model<IReview>;
