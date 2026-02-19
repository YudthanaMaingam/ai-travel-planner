import mongoose, { Schema, Document } from 'mongoose';

export interface ITrip extends Document {
  title: string;
  destination: string;
  duration: string;
  plan: string;
  locations: {
    name: string;
    lat: number;
    lng: number;
    day?: number;
    description?: string;
  }[];
  createdAt: Date;
}

const TripSchema: Schema = new Schema({
  title: { type: String, required: true },
  destination: { type: String, required: true },
  duration: { type: String, required: true },
  plan: { type: String, required: true },
  locations: [
    {
      name: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      day: { type: Number },
      description: { type: String },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Trip || mongoose.model<ITrip>('Trip', TripSchema);
