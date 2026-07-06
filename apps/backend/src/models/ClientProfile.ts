import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IClientProfile extends Document {
  userId: Types.ObjectId;
  currentLocation: {
    type: 'Point';
    coordinates: [number, number];
  };
}

const ClientProfileSchema = new Schema<IClientProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
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
  },
  { timestamps: true }
);

ClientProfileSchema.index({ currentLocation: '2dsphere' });

export default (mongoose.models.ClientProfile ||
  mongoose.model<IClientProfile>('ClientProfile', ClientProfileSchema)) as mongoose.Model<IClientProfile>;
