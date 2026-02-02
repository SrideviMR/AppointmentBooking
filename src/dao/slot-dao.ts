import { transactWrite, TABLE_NAME } from "../utils/dynamodb";
import { Keys } from "../types/db-keys";
import { getCurrentTimestamp } from "../utils/time";
import { logger } from "../utils/logger";
import { updateItem } from "../utils/dynamodb";
import { SlotStatus, BookingState, DynamoDBErrorName } from "../types/enums";

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
        ":held": SlotStatus.HELD,
        ":available": SlotStatus.AVAILABLE,
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
    if (err.name === DynamoDBErrorName.CONDITIONAL_CHECK_FAILED) {
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
          #status = :reserved,
          confirmedAt = :confirmedAt
        REMOVE 
          holdExpiresAt
      `,
      {
        ":reserved": SlotStatus.RESERVED,
        ":held": SlotStatus.HELD,
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
    if (err.name === DynamoDBErrorName.CONDITIONAL_CHECK_FAILED) {
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
        REMOVE heldBy, holdExpiresAt, confirmedAt
      `,
      {
        ":available": SlotStatus.AVAILABLE,
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
    if (err.name === DynamoDBErrorName.CONDITIONAL_CHECK_FAILED) {
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

/**
 * Atomically confirm booking and reserve slot using DynamoDB transaction
 */
const confirmBookingAndReserveSlot = async (
  bookingId: string,
  providerId: string,
  slotId: string
): Promise<void> => {
  const [date, time] = slotId.split("#");
  const confirmedAt = getCurrentTimestamp();

  logger.debug("Attempting atomic booking confirmation and slot reservation", {
    bookingId,
    providerId,
    slotId,
  });

  const transactItems = [
    {
      Update: {
        TableName: TABLE_NAME,
        Key: Keys.booking(bookingId),
        UpdateExpression: "SET #state = :confirmed, confirmedAt = :confirmedAt",
        ExpressionAttributeNames: { "#state": "state" },
        ExpressionAttributeValues: {
          ":confirmed": BookingState.CONFIRMED,
          ":confirmedAt": confirmedAt,
          ":pending": BookingState.PENDING,
        },
        ConditionExpression: "#state = :pending",
      },
    },
    {
      Update: {
        TableName: TABLE_NAME,
        Key: Keys.slot(providerId, date, time),
        UpdateExpression: "SET #status = :reserved, confirmedAt = :confirmedAt REMOVE holdExpiresAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":reserved": SlotStatus.RESERVED,
          ":held": SlotStatus.HELD,
          ":bookingId": bookingId,
          ":confirmedAt": confirmedAt,
        },
        ConditionExpression: "#status = :held AND heldBy = :bookingId",
      },
    },
  ];

  await transactWrite(transactItems);
  logger.info("Booking confirmed and slot reserved atomically", { bookingId, slotId });
};

/**
 * Atomically expire booking and release slot using DynamoDB transaction
 */
const expireBookingAndReleaseSlot = async (
  bookingId: string,
  providerId: string,
  slotId: string
): Promise<void> => {
  const [date, time] = slotId.split("#");

  logger.debug("Attempting atomic booking expiration and slot release", {
    bookingId,
    providerId,
    slotId,
  });

  const transactItems = [
    {
      Update: {
        TableName: TABLE_NAME,
        Key: Keys.booking(bookingId),
        UpdateExpression: "SET #state = :expired",
        ExpressionAttributeNames: { "#state": "state" },
        ExpressionAttributeValues: {
          ":expired": BookingState.EXPIRED,
          ":pending": BookingState.PENDING,
        },
        ConditionExpression: "#state = :pending",
      },
    },
    {
      Update: {
        TableName: TABLE_NAME,
        Key: Keys.slot(providerId, date, time),
        UpdateExpression: "SET #status = :available REMOVE heldBy, holdExpiresAt, confirmedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":available": SlotStatus.AVAILABLE,
          ":bookingId": bookingId,
        },
        ConditionExpression: "heldBy = :bookingId",
      },
    },
  ];

  await transactWrite(transactItems);
  logger.info("Booking expired and slot released atomically", { bookingId, slotId });
};
/**
 * Atomically cancel booking and release slot using DynamoDB transaction
 */
const cancelBookingAndReleaseSlot = async (
  bookingId: string,
  providerId: string,
  slotId: string
): Promise<void> => {
  const [date, time] = slotId.split("#");
  const cancelledAt = getCurrentTimestamp();

  logger.debug("Attempting atomic booking cancellation and slot release", {
    bookingId,
    providerId,
    slotId,
  });

  const transactItems = [
    {
      Update: {
        TableName: TABLE_NAME,
        Key: Keys.booking(bookingId),
        UpdateExpression: "SET #state = :cancelled, cancelledAt = :cancelledAt",
        ExpressionAttributeNames: { "#state": "state" },
        ExpressionAttributeValues: {
          ":cancelled": BookingState.CANCELLED,
          ":cancelledAt": cancelledAt,
          ":pending": BookingState.PENDING,
          ":confirmed": BookingState.CONFIRMED,
        },
        ConditionExpression: "#state IN (:pending, :confirmed)",
      },
    },
    {
      Update: {
        TableName: TABLE_NAME,
        Key: Keys.slot(providerId, date, time),
        UpdateExpression: "SET #status = :available REMOVE heldBy, holdExpiresAt, confirmedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":available": SlotStatus.AVAILABLE,
          ":bookingId": bookingId,
        },
        ConditionExpression: "heldBy = :bookingId",
      },
    },
  ];

  await transactWrite(transactItems);
  logger.info("Booking cancelled and slot released atomically", { bookingId, slotId });
};

export const slotDao = {
  holdSlot,
  confirmSlot,
  releaseSlot,
  confirmBookingAndReserveSlot,
  expireBookingAndReleaseSlot,
  cancelBookingAndReleaseSlot,
};
