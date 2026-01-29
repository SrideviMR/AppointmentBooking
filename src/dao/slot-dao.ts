import { updateItem } from "../utils/dynamodb";
import { Keys } from "../types/db-keys";
import { getCurrentTimestamp } from "../utils/time";
import { logger } from "../utils/logger";

/**
 * Slot lifecycle:
 * AVAILABLE → HELD → CONFIRMED
 * HELD → AVAILABLE (cancel / expiry)
 */

const holdSlot = async (
  providerId: string,
  slotId: string,
  bookingId: string,
  holdExpiresAt: string
): Promise<boolean> => {
  const [date, time] = slotId.split("#");

  logger.debug("Attempting to hold slot", {
    providerId,
    slotId,
    bookingId,
  });

  try {
    await updateItem(
      Keys.slot(providerId, date, time),
      `
        SET 
          #status = :held,
          heldBy = :bookingId,
          holdExpiresAt = :ttl
      `,
      {
        ":held": "HELD",
        ":available": "AVAILABLE",
        ":bookingId": bookingId,
        ":ttl": holdExpiresAt,
        ":now": new Date().toISOString(),
      },
      {
        "#status": "status",
      },
      `
        #status = :available
        OR (#status = :held AND holdExpiresAt < :now)
      `
    );
  

    logger.info("Slot held successfully", { providerId, slotId, bookingId });
    return true;
  } catch (err: any) {
    if (err.name === "ConditionalCheckFailedException") {
      logger.warn("Slot already unavailable", { providerId, slotId });
      return false;
    }
    throw err;
  }
};

/**
 * Confirm slot — only if HELD by this booking
 */
const confirmSlot = async (
  providerId: string,
  slotId: string,
  bookingId: string
): Promise<boolean> => {
  const [date, time] = slotId.split("#");

  logger.debug("Attempting to confirm slot", {
    providerId,
    slotId,
    bookingId,
  });

  try {
    await updateItem(
      Keys.slot(providerId, date, time),
      `
        SET 
          #status = :confirmed,
          confirmedAt = :confirmedAt
        REMOVE 
          heldBy,
          holdExpiresAt
      `,
      {
        ":confirmed": "CONFIRMED",
        ":held": "HELD",
        ":bookingId": bookingId,
        ":confirmedAt": getCurrentTimestamp(),
      },
      {
        "#status": "status",
      },
      "#status = :held AND heldBy = :bookingId"
    );

    logger.info("Slot confirmed", { providerId, slotId, bookingId });
    return true;
  } catch (err: any) {
    if (err.name === "ConditionalCheckFailedException") {
      logger.warn("Slot not held by this booking", {
        providerId,
        slotId,
        bookingId,
      });
      return false;
    }
    throw err;
  }
};

/**
 * Release slot — used for cancel / expiry
 */
const releaseSlot = async (
  providerId: string,
  slotId: string,
  bookingId: string
): Promise<boolean> => {
  const [date, time] = slotId.split("#");

  logger.debug("Attempting to release slot", {
    providerId,
    slotId,
    bookingId,
  });

  try {
    await updateItem(
      Keys.slot(providerId, date, time),
      `
        SET #status = :available
        REMOVE heldBy, holdExpiresAt
      `,
      {
        ":available": "AVAILABLE",
        ":bookingId": bookingId,
      },
      {
        "#status": "status",
      },
      "heldBy = :bookingId"
    );

    logger.info("Slot released", { providerId, slotId, bookingId });
    return true;
  } catch (err: any) {
    if (err.name === "ConditionalCheckFailedException") {
      logger.warn("Slot release skipped (not held by booking)", {
        providerId,
        slotId,
        bookingId,
      });
      return false;
    }
    throw err;
  }
};

export const slotDao = {
  holdSlot,
  confirmSlot,
  releaseSlot,
};
