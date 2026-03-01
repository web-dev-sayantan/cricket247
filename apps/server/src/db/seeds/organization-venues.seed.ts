import { db } from "@/db";
import { organizationVenues } from "@/db/schema";

const ORGANIZATION_ID = 91_001;
const ORGANIZATION_VENUE_SEEDS = [
  {
    id: 93_301,
    organizationId: ORGANIZATION_ID,
    venueId: 92_001,
  },
  {
    id: 93_302,
    organizationId: ORGANIZATION_ID,
    venueId: 92_002,
  },
  {
    id: 93_303,
    organizationId: ORGANIZATION_ID,
    venueId: 92_003,
  },
] as const;

const seedOrganizationVenues = async () => {
  await db.transaction(async (tx) => {
    for (const organizationVenue of ORGANIZATION_VENUE_SEEDS) {
      await tx
        .insert(organizationVenues)
        .values(organizationVenue)
        .onConflictDoUpdate({
          target: organizationVenues.id,
          set: {
            organizationId: organizationVenue.organizationId,
            venueId: organizationVenue.venueId,
          },
        });
    }
  });
};

await seedOrganizationVenues();
