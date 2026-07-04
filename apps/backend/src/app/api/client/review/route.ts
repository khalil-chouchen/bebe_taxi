import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/middleware/auth';
import Review from '@/models/Review';
import Trip from '@/models/Trip';
import TaxiProfile from '@/models/TaxiProfile';
import { connectDB } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'client');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { tripId, rating, comment } = body;

    if (!tripId || !rating) {
      return NextResponse.json({ error: 'tripId and rating are required' }, { status: 400 });
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: 'Rating must be an integer between 1 and 5' },
        { status: 400 }
      );
    }

    await connectDB();

    const trip = await Trip.findOne({
      _id: tripId,
      clientId: auth.user._id,
      status: 'completed',
    });

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found or not completed' },
        { status: 404 }
      );
    }

    // Check not already reviewed
    const existing = await Review.findOne({ tripId });
    if (existing) {
      return NextResponse.json({ error: 'Trip already reviewed' }, { status: 409 });
    }

    const review = await Review.create({
      tripId,
      clientId: auth.user._id,
      taxiId: trip.taxiId,
      rating,
      comment: comment?.trim(),
    });

    // Update taxi average rating
    const allReviews = await Review.find({ taxiId: trip.taxiId });
    const totalReviews = allReviews.length;
    const averageRating =
      totalReviews > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    await TaxiProfile.findOneAndUpdate(
      { userId: trip.taxiId },
      { averageRating: Math.round(averageRating * 10) / 10, totalReviews }
    );

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error('[client/review]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
