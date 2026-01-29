import { ScheduledEvent } from "aws-lambda";
import { Booking } from "../types/booking";
import { Keys } from "../types/db-keys";
import { queryItems, updateItem } from "../utils/dynamodb";
import { getCurrentTimestamp } from "../utils/time";
import { bookingDao } from "../dao/booking-dao";

export async function handler(event: ScheduledEvent): Promise<void> {
  console.log("Running expiration worker at:", event.time);

  try {
    // Query expired PENDING bookings using GSI3
    const expiredBookings = await queryItems(
      "GSI3PK = :status AND GSI3SK < :now",
      {
        ":status": "STATUS#PENDING",
        ":now": `EXPIRES#${getCurrentTimestamp()}`,
      },
      undefined,
      undefined,
      "GSI3"
    );

    console.log(`Found ${expiredBookings.length} expired bookings`);

    if (expiredBookings.length === 0) {
      return;
    }

    // Process each expired booking
    const results = await Promise.allSettled(
      (expiredBookings as Booking[]).map((booking) => expireBooking(booking))
    );

    // Log results
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`Expired ${succeeded} bookings, ${failed} failures`);
  } catch (error: any) {
    console.error("Error in expiration worker:", error);
    throw error;
  }
}

async function expireBooking(booking: Booking): Promise<void> {
  const bookingId = booking.PK.replace("BOOKING#", "");
  console.log(`Expiring booking ${bookingId}`);

  try {
    // Step 1: Update booking state to EXPIRED
    const bookingKeys = Keys.booking(bookingId);

    await bookingDao.expire(bookingId)

    // Step 2: Release the slot
    const [date, time] = booking.slotId.split("#");
    const slotKeys = Keys.slot(booking.providerId, date, time);

    await updateItem(
      slotKeys,
      "SET #status = :available REMOVE heldBy, reservedAt",
      {
        ":available": "AVAILABLE",
        ":bookingId": bookingId,
      },
      {
        "#status": "status",
      },
      "heldBy = :bookingId"
    );

    console.log(`Booking ${bookingId} expired and slot released`);
  } catch (error: any) {
    if (error.name === "ConditionalCheckFailedException") {
      console.log(`Booking ${bookingId} already processed`);
      return;
    }
    throw error;
  }
}