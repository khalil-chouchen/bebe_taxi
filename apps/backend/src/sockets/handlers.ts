import { Server, Socket } from 'socket.io';
import { verifyToken } from '@/lib/jwt';
import { connectDB } from '@/lib/mongodb';
import TaxiProfile from '@/models/TaxiProfile';
import ClientProfile from '@/models/ClientProfile';
import TaxiRequest from '@/models/TaxiRequest';
import TaxiOffer from '@/models/TaxiOffer';
import Trip from '@/models/Trip';
import { SOCKET_EVENTS, TAXI_ARRIVAL_RADIUS_METERS } from '@bebe-taxi/shared/constants';
import { haversineDistanceKm, estimateEtaMinutes, metersFromCoords } from '@/utils/haversine';

interface AuthSocket extends Socket {
  userId?: string;
  userRole?: 'client' | 'taxi';
}

// In-memory maps for active socket connections
const taxiSockets = new Map<string, string>(); // taxiUserId → socketId
const clientSockets = new Map<string, string>(); // clientUserId → socketId

export function setupSocketHandlers(io: Server) {
  io.use(async (socket: AuthSocket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string) ||
        (socket.handshake.query?.token as string);

      if (!token) return next(new Error('No token provided'));

      const payload = verifyToken(token);
      socket.userId = payload.userId;
      socket.userRole = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: AuthSocket) => {
    const userId = socket.userId!;
    const role = socket.userRole!;

    console.log(`[Socket] ${role} connected: ${userId} (${socket.id})`);

    if (role === 'taxi') {
      taxiSockets.set(userId, socket.id);
    } else {
      clientSockets.set(userId, socket.id);
    }

    socket.join(`user:${userId}`);

    // ─────────────────────────────────────────────────────────────────────────
    // TAXI EVENTS
    // ─────────────────────────────────────────────────────────────────────────

    socket.on(SOCKET_EVENTS.TAXI_GO_ONLINE, async () => {
      if (role !== 'taxi') return;
      try {
        await connectDB();
        await TaxiProfile.findOneAndUpdate(
          { userId },
          { isOnline: true, isAvailable: true }
        );
        console.log(`[Socket] Taxi online: ${userId}`);
      } catch (e) {
        console.error('[Socket] taxi:goOnline error', e);
      }
    });

    socket.on(SOCKET_EVENTS.TAXI_GO_OFFLINE, async () => {
      if (role !== 'taxi') return;
      try {
        await connectDB();
        await TaxiProfile.findOneAndUpdate(
          { userId },
          { isOnline: false, isAvailable: false }
        );
      } catch (e) {
        console.error('[Socket] taxi:goOffline error', e);
      }
    });

    socket.on(
      SOCKET_EVENTS.TAXI_UPDATE_LOCATION,
      async (data: { latitude: number; longitude: number }) => {
        if (role !== 'taxi') return;
        const { latitude, longitude } = data;

        try {
          await connectDB();
          await TaxiProfile.findOneAndUpdate(
            { userId },
            { currentLocation: { type: 'Point', coordinates: [longitude, latitude] } }
          );

          // If this taxi has an active trip, forward location to the client
          const activeTrip = await Trip.findOne({
            taxiId: userId,
            status: { $in: ['accepted', 'arriving'] },
          });

          if (activeTrip) {
            const clientSocketId = clientSockets.get(activeTrip.clientId.toString());
            if (clientSocketId) {
              io.to(clientSocketId).emit(SOCKET_EVENTS.TRIP_LOCATION_UPDATE, {
                latitude,
                longitude,
                role: 'taxi',
              });
            }

            // Check if taxi has arrived near client
            const clientProfile = await ClientProfile.findOne({
              userId: activeTrip.clientId,
            });
            if (clientProfile) {
              const [clientLng, clientLat] = clientProfile.currentLocation.coordinates;
              const meters = metersFromCoords(latitude, longitude, clientLat, clientLng);

              if (meters <= TAXI_ARRIVAL_RADIUS_METERS && activeTrip.status !== 'arrived') {
                await Trip.findByIdAndUpdate(activeTrip._id, {
                  status: 'arrived',
                  arrivedAt: new Date(),
                });

                // Notify client
                if (clientSocketId) {
                  io.to(clientSocketId).emit(SOCKET_EVENTS.TRIP_ARRIVED, {
                    message: 'Votre taxi est arrivé !',
                  });
                }
                // Notify taxi too
                socket.emit(SOCKET_EVENTS.TRIP_ARRIVED, { confirmed: true });
              }
            }
          }
        } catch (e) {
          console.error('[Socket] taxi:updateLocation error', e);
        }
      }
    );

    socket.on(
      SOCKET_EVENTS.TAXI_SEND_OFFER,
      async (data: { requestId: string }) => {
        if (role !== 'taxi') return;

        try {
          await connectDB();

          const request = await TaxiRequest.findById(data.requestId);
          if (!request || request.status !== 'searching') {
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Request no longer available' });
            return;
          }

          // Prevent taxi from offering on an already-expired request
          if (request.expiresAt < new Date()) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Request expired' });
            return;
          }

          const taxiProfile = await TaxiProfile.findOne({ userId });
          if (!taxiProfile) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Taxi profile not found' });
            return;
          }

          const [clientLng, clientLat] = request.clientLocation.coordinates;
          const [taxiLng, taxiLat] = taxiProfile.currentLocation.coordinates;
          const distanceKm = haversineDistanceKm(taxiLat, taxiLng, clientLat, clientLng);
          const etaMinutes = estimateEtaMinutes(distanceKm);

          // Upsert offer (prevent duplicate)
          const offer = await TaxiOffer.findOneAndUpdate(
            { requestId: data.requestId, taxiId: userId },
            { distanceKm, etaMinutes, status: 'pending' },
            { upsert: true, new: true }
          );

          // Notify client in real time
          const clientSocketId = clientSockets.get(request.clientId.toString());
          if (clientSocketId) {
            // Populate taxi info for the offer
            const { default: User } = await import('@/models/User');
            const taxiUser = await User.findById(userId);

            io.to(clientSocketId).emit(SOCKET_EVENTS.OFFER_NEW, {
              offer: {
                _id: offer._id,
                requestId: offer.requestId,
                taxiId: offer.taxiId,
                distanceKm: offer.distanceKm,
                etaMinutes: offer.etaMinutes,
                status: offer.status,
                createdAt: offer.createdAt,
              },
              taxi: {
                userId,
                fullName: taxiUser?.fullName,
                phone: taxiUser?.phone,
                avatarUrl: taxiUser?.avatarUrl,
                taxiNumber: taxiProfile.taxiNumber,
                matricule: taxiProfile.matricule,
                averageRating: taxiProfile.averageRating,
              },
            });
          }
        } catch (e: any) {
          if (e.code === 11000) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'You already sent an offer' });
          } else {
            console.error('[Socket] taxi:sendOffer error', e);
          }
        }
      }
    );

    socket.on(SOCKET_EVENTS.TAXI_ARRIVED, async () => {
      if (role !== 'taxi') return;
      try {
        await connectDB();
        const trip = await Trip.findOneAndUpdate(
          { taxiId: userId, status: { $in: ['accepted', 'arriving'] } },
          { status: 'arrived', arrivedAt: new Date() },
          { new: true }
        );
        if (trip) {
          const clientSocketId = clientSockets.get(trip.clientId.toString());
          if (clientSocketId) {
            io.to(clientSocketId).emit(SOCKET_EVENTS.TRIP_ARRIVED, {
              message: 'Votre taxi est arrivé !',
            });
          }
        }
      } catch (e) {
        console.error('[Socket] taxi:arrived error', e);
      }
    });

    socket.on(SOCKET_EVENTS.TAXI_COMPLETE_TRIP, async () => {
      if (role !== 'taxi') return;
      try {
        await connectDB();
        const trip = await Trip.findOneAndUpdate(
          { taxiId: userId, status: { $in: ['arrived', 'arriving'] } },
          { status: 'completed', completedAt: new Date() },
          { new: true }
        );
        if (trip) {
          // Mark taxi available again
          await TaxiProfile.findOneAndUpdate({ userId }, { isAvailable: true });
          // Mark request completed
          await TaxiRequest.findByIdAndUpdate(trip.requestId, { status: 'completed' });

          const clientSocketId = clientSockets.get(trip.clientId.toString());
          if (clientSocketId) {
            io.to(clientSocketId).emit(SOCKET_EVENTS.TRIP_COMPLETED, {
              tripId: trip._id,
            });
          }
        }
      } catch (e) {
        console.error('[Socket] taxi:completeTrip error', e);
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // CLIENT EVENTS
    // ─────────────────────────────────────────────────────────────────────────

    socket.on(
      SOCKET_EVENTS.CLIENT_UPDATE_LOCATION,
      async (data: { latitude: number; longitude: number }) => {
        if (role !== 'client') return;
        try {
          await connectDB();
          await ClientProfile.findOneAndUpdate(
            { userId },
            {
              currentLocation: {
                type: 'Point',
                coordinates: [data.longitude, data.latitude],
              },
            }
          );

          // During active trip forward location to taxi
          const activeTrip = await Trip.findOne({
            clientId: userId,
            status: { $in: ['accepted', 'arriving', 'arrived'] },
          });
          if (activeTrip) {
            const taxiSocketId = taxiSockets.get(activeTrip.taxiId.toString());
            if (taxiSocketId) {
              io.to(taxiSocketId).emit(SOCKET_EVENTS.TRIP_LOCATION_UPDATE, {
                latitude: data.latitude,
                longitude: data.longitude,
                role: 'client',
              });
            }
          }
        } catch (e) {
          console.error('[Socket] client:updateLocation error', e);
        }
      }
    );

    socket.on(
      SOCKET_EVENTS.CLIENT_ACCEPT_OFFER,
      async (data: { offerId: string; requestId: string }) => {
        if (role !== 'client') return;

        try {
          await connectDB();
          const { default: User } = await import('@/models/User');

          // Atomic: mark request accepted only if still searching
          const request = await TaxiRequest.findOneAndUpdate(
            { _id: data.requestId, clientId: userId, status: 'searching' },
            { status: 'accepted' },
            { new: true }
          );

          if (!request) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Request no longer available' });
            return;
          }

          // Accept the chosen offer
          const acceptedOffer = await TaxiOffer.findOneAndUpdate(
            { _id: data.offerId, requestId: data.requestId, status: 'pending' },
            { status: 'accepted' },
            { new: true }
          );

          if (!acceptedOffer) {
            // Rollback request status
            await TaxiRequest.findByIdAndUpdate(data.requestId, { status: 'searching' });
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Offer no longer available' });
            return;
          }

          // Reject all other pending offers for this request
          await TaxiOffer.updateMany(
            {
              requestId: data.requestId,
              _id: { $ne: data.offerId },
              status: 'pending',
            },
            { status: 'rejected' }
          );

          // Mark accepted taxi as unavailable
          await TaxiProfile.findOneAndUpdate(
            { userId: acceptedOffer.taxiId },
            { isAvailable: false }
          );

          // Get locations for trip creation
          const clientProfile = await ClientProfile.findOne({ userId });
          const taxiProfile = await TaxiProfile.findOne({
            userId: acceptedOffer.taxiId,
          });

          if (!clientProfile || !taxiProfile) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Profile not found' });
            return;
          }

          // Create trip
          const trip = await Trip.create({
            requestId: data.requestId,
            clientId: userId,
            taxiId: acceptedOffer.taxiId,
            startLocation: clientProfile.currentLocation,
            taxiStartLocation: taxiProfile.currentLocation,
            status: 'accepted',
            acceptedAt: new Date(),
          });

          // Update request with accepted taxi
          await TaxiRequest.findByIdAndUpdate(data.requestId, {
            acceptedTaxiId: acceptedOffer.taxiId,
          });

          // Notify the accepted taxi
          const taxiUser = await User.findById(acceptedOffer.taxiId);
          const taxiSocketId = taxiSockets.get(acceptedOffer.taxiId.toString());

          if (taxiSocketId) {
            io.to(taxiSocketId).emit(SOCKET_EVENTS.OFFER_ACCEPTED, {
              trip: {
                _id: trip._id,
                clientId: userId,
                clientLocation: clientProfile.currentLocation,
              },
              message: 'Le client a accepté votre offre !',
            });
          }

          // Notify rejected taxis
          const rejectedOffers = await TaxiOffer.find({
            requestId: data.requestId,
            status: 'rejected',
            _id: { $ne: data.offerId },
          });

          for (const rejected of rejectedOffers) {
            const rejTaxiSocketId = taxiSockets.get(rejected.taxiId.toString());
            if (rejTaxiSocketId) {
              io.to(rejTaxiSocketId).emit(SOCKET_EVENTS.OFFER_REJECTED, {
                requestId: data.requestId,
                message: 'Le client a choisi un autre taxi',
              });
            }
          }

          // Confirm to client
          const clientUser = await User.findById(userId);
          socket.emit(SOCKET_EVENTS.TRIP_STARTED, {
            trip: {
              _id: trip._id,
              requestId: data.requestId,
              taxiId: acceptedOffer.taxiId,
              taxiLocation: taxiProfile.currentLocation,
            },
            taxi: {
              fullName: taxiUser?.fullName,
              phone: taxiUser?.phone,
              avatarUrl: taxiUser?.avatarUrl,
              taxiNumber: taxiProfile.taxiNumber,
              matricule: taxiProfile.matricule,
            },
          });

          // Remove request from active broadcast (other drivers should no longer see it)
          io.emit(SOCKET_EVENTS.REQUEST_CANCELLED, { requestId: data.requestId });
        } catch (e) {
          console.error('[Socket] client:acceptOffer error', e);
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Server error' });
        }
      }
    );

    socket.on(
      SOCKET_EVENTS.CLIENT_CANCEL_REQUEST,
      async (data: { requestId: string }) => {
        if (role !== 'client') return;
        try {
          await connectDB();
          await TaxiRequest.findOneAndUpdate(
            { _id: data.requestId, clientId: userId, status: 'searching' },
            { status: 'cancelled' }
          );

          // Expire all pending offers
          await TaxiOffer.updateMany(
            { requestId: data.requestId, status: 'pending' },
            { status: 'expired' }
          );

          // Broadcast cancellation to all taxis
          io.emit(SOCKET_EVENTS.REQUEST_CANCELLED, { requestId: data.requestId });
        } catch (e) {
          console.error('[Socket] client:cancelRequest error', e);
        }
      }
    );

    socket.on(SOCKET_EVENTS.CLIENT_COMPLETE_TRIP, async () => {
      if (role !== 'client') return;
      try {
        await connectDB();
        const trip = await Trip.findOneAndUpdate(
          { clientId: userId, status: 'arrived' },
          { status: 'completed', completedAt: new Date() },
          { new: true }
        );
        if (trip) {
          await TaxiProfile.findOneAndUpdate(
            { userId: trip.taxiId },
            { isAvailable: true }
          );
          await TaxiRequest.findByIdAndUpdate(trip.requestId, { status: 'completed' });

          const taxiSocketId = taxiSockets.get(trip.taxiId.toString());
          if (taxiSocketId) {
            io.to(taxiSocketId).emit(SOCKET_EVENTS.TRIP_COMPLETED, {
              tripId: trip._id,
            });
          }
        }
      } catch (e) {
        console.error('[Socket] client:completeTrip error', e);
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────────────────────────────────────

    socket.on('disconnect', async () => {
      console.log(`[Socket] ${role} disconnected: ${userId}`);
      if (role === 'taxi') {
        taxiSockets.delete(userId);
        try {
          await connectDB();
          await TaxiProfile.findOneAndUpdate(
            { userId },
            { isOnline: false, isAvailable: false }
          );
        } catch {}
      } else {
        clientSockets.delete(userId);
      }
    });
  });
}

// Export maps so REST routes can emit to specific users
export { taxiSockets, clientSockets };
