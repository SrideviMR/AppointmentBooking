import { putItem, updateItem, getItem } from "../utils/dynamodb";
import { Booking, BookingState } from "../types/booking";
import { Keys } from "../types/db-keys";
import { getCurrentTimestamp } from "../utils/time";

const createPendingBooking = async ({
    bookingId,
    providerId,
    slotId,
    userId,
    expiresAt
  }: {
    bookingId: string;
    providerId: string;
    slotId: string;
    userId: string;
    expiresAt: string;
  }) => {
    return putItem({
      ...Keys.booking(bookingId),
      providerId,
      slotId,
      userId,
      state: "PENDING",
      createdAt: getCurrentTimestamp(),
      expiresAt,
      GSI1PK: `USER#${userId}`,
      GSI1SK: `BOOKING#${getCurrentTimestamp()}`,
      GSI2PK: `PROVIDER#${providerId}`,
      GSI2SK: `BOOKING#${getCurrentTimestamp()}`,
      GSI3PK: "STATUS#PENDING",
      GSI3SK: `EXPIRES#${expiresAt}`,
    });
  };

  const getBookingById = async (
    bookingId: string
  ): Promise<Booking | undefined> => {
    return getItem<Booking>(Keys.booking(bookingId));
  };
  
  
  const updateBookingState = async ({
    bookingId,
    from,
    to,
    extraUpdates = {},
  }: {
    bookingId: string;
    from: BookingState | BookingState[];
    to: BookingState;
    extraUpdates?: Record<string, any>;
  }) => {
    const allowedStates = Array.isArray(from) ? from : [from];
  
    return updateItem(
      Keys.booking(bookingId),
      `
        SET #state = :to,
            GSI3PK = :gsi3pk,
            ${Object.keys(extraUpdates).map(k => `${k} = :${k}`).join(", ")}
      `,
      {
        ":to": to,
        ":gsi3pk": `STATUS#${to}`,
        ...Object.fromEntries(
          Object.entries(extraUpdates).map(([k, v]) => [`:${k}`, v])
        ),
        ...allowedStates.reduce(
          (acc, s, i) => ({ ...acc, [`:from${i}`]: s }),
          {}
        ),
      },
      { "#state": "state" },
      `#state IN (${allowedStates.map((_, i) => `:from${i}`).join(", ")})`
    );
  };


export const bookingDao = {
  createPendingBooking,
  updateBookingState,
    getBookingById,
    confirm: async (bookingId: string) => {
        await updateBookingState({
          bookingId,
          from: "PENDING",
          to: "CONFIRMED",
          extraUpdates: { confirmedAt: getCurrentTimestamp() },
        });
      },
      
      cancel: async(bookingId: string) =>
        await updateBookingState({
          bookingId,
          from: ["PENDING", "CONFIRMED"],
          to: "CANCELLED",
          extraUpdates: { cancelledAt: getCurrentTimestamp() },
        }),
    
      expire: async (bookingId: string) =>
        await updateBookingState({
          bookingId,
          from: "PENDING",
          to: "EXPIRED",
        }),
};
