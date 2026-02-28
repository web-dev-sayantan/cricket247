import { db } from "@/db";
import { tournamentVenues, venues } from "@/db/schema";

const TOURNAMENT_ID = 91_001;

const VENUE_SEEDS = [
  {
    id: 92_001,
    name: "Central Cricket Ground",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    location: "Mumbai, Maharashtra",
    capacity: 45_000,
    lights: true,
    openingTime: 8 * 60,
    closingTime: 22 * 60,
  },
  {
    id: 92_002,
    name: "Riverside Oval",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    location: "Bengaluru, Karnataka",
    capacity: 32_000,
    lights: true,
    openingTime: 8 * 60,
    closingTime: 22 * 60,
  },
  {
    id: 92_003,
    name: "Liberty Stadium",
    city: "Delhi",
    state: "Delhi",
    country: "India",
    location: "Delhi, India",
    capacity: 50_000,
    lights: true,
    openingTime: 8 * 60,
    closingTime: 22 * 60,
  },
] as const;

const seedVenues = async () => {
  await db.transaction(async (tx) => {
    for (const venue of VENUE_SEEDS) {
      await tx
        .insert(venues)
        .values(venue)
        .onConflictDoUpdate({
          target: venues.id,
          set: {
            name: venue.name,
            city: venue.city,
            state: venue.state,
            country: venue.country,
            location: venue.location,
            capacity: venue.capacity,
            lights: venue.lights,
            openingTime: venue.openingTime,
            closingTime: venue.closingTime,
          },
        });
    }

    const tournament = await tx.query.tournaments.findFirst({
      where: {
        id: TOURNAMENT_ID,
      },
    });

    if (!tournament) {
      return;
    }

    for (const [index, venue] of VENUE_SEEDS.entries()) {
      await tx
        .insert(tournamentVenues)
        .values({
          id: 92_101 + index,
          tournamentId: TOURNAMENT_ID,
          venueId: venue.id,
        })
        .onConflictDoUpdate({
          target: tournamentVenues.id,
          set: {
            tournamentId: TOURNAMENT_ID,
            venueId: venue.id,
          },
        });
    }
  });
};

await seedVenues();
