import { db } from "@/db";
import { venues } from "@/db/schema";

export const getAllVenues = () => db.select().from(venues);
