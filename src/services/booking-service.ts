import { bookingDao } from "../dao/booking-dao";
import { slotDao } from "../dao/slot-dao";
import { getCurrentTimestamp, generateExpirationTime } from "../utils/time";
import { randomUUID } from "crypto";
import { sendMessage } from "../utils/sqs";
import { queryItems } from "../utils/dynamodb";
import { Slot } from "../types/slot";
import { BookingQueueMessage, CreateBookingInput, CreateBookingResponse } from "../types/booking";
import { BookingState, SlotStatus, DynamoDBErrorName } from "../types/enums";
import { logger } from "../utils/logger";
import { CancelBookingRequest, CancelBookingResult, ConfirmBookingRequest, ConfirmBookingResult, SlotUnavailableError, BookingNotFoundError, BookingConflictError} from "../types/booking"

const QUEUE_URL = process.env.BOOKING_QUEUE_URL!;


export const bookingService = {
  async createBooking({ providerId, slotId, userId }: CreateBookingInput): Promise<CreateBookingResponse> {
    const [date, time] = slotId.split("#");
    
    // Validate slot exists
    const slotItems = await queryItems(
      "PK = :pk AND SK = :sk",
      {
        ":pk": `PROVIDER#${providerId}`,
        ":sk": `SLOT#${date}#${time}`,
      }
    );
    
    if (!slotItems || slotItems.length === 0) {
      throw new SlotUnavailableError("Slot does not exist. Please create availability first.");
    }
    
    const slot = slotItems[0] as Slot;
    
    // Check slot availability
    if (slot.status === SlotStatus.HELD && slot.holdExpiresAt && new Date(slot.holdExpiresAt) > new Date()) {
      throw new SlotUnavailableError(`Slot is held by another user until ${slot.holdExpiresAt}`);
    } else if (slot.status === SlotStatus.RESERVED) {
      throw new SlotUnavailableError("Slot is already booked. Please select another slot.");
    }
    
    const bookingId = `booking-${randomUUID()}`;
    const expiresAt = generateExpirationTime(5);

    // Hold slot atomically
    try {
      await slotDao.holdSlot(providerId, slotId, bookingId, expiresAt);
    } catch (err: any) {
      if (err.name === DynamoDBErrorName.CONDITIONAL_CHECK_FAILED) {
        throw new SlotUnavailableError("Slot is held by another booking");
      }
    
      throw new Error("Failed to hold slot");
    }
    
    
    // Send to SQS for async booking creation
    const message: BookingQueueMessage = {
      bookingId,
      providerId,
      slotId,
      userId,
      timestamp: getCurrentTimestamp(),
    };

    try {
      await sendMessage({ QueueUrl: QUEUE_URL, MessageBody: JSON.stringify(message) });
    } catch (error: any) {
      throw new error(error.message);
    }

    return {
      bookingId,
      status: BookingState.PENDING,
      expiresAt,
    };
  },

  async confirmBooking({ bookingId }: ConfirmBookingRequest): Promise<ConfirmBookingResult> {
    const booking = await bookingDao.getBookingById(bookingId);

    if (!booking) {
      throw new BookingNotFoundError(bookingId);
    }

    const confirmedAt = getCurrentTimestamp();

    try {
      await slotDao.confirmBookingAndReserveSlot(bookingId, booking.providerId, booking.slotId);
      
      return {
        bookingId,
        state: BookingState.CONFIRMED,
        confirmedAt,
        message: "Booking confirmed successfully",
      };
    } catch (error: any) {
      if (error.name === DynamoDBErrorName.TRANSACTION_CANCELLED) {
        logger.info(
          `Booking ${bookingId} transaction cancelled`
        );
        throw new BookingConflictError("Booking confirmation failed due to transaction conflict");
      }
      
      logger.error(`Failed to confirm booking ${bookingId}:`, error);
      throw error;
    }
  },

  async cancelBooking({ bookingId }: CancelBookingRequest): Promise<CancelBookingResult> {
    const booking = await bookingDao.getBookingById(bookingId);

    if (!booking) {
      throw new BookingNotFoundError(bookingId);
    }

    const cancelledAt = getCurrentTimestamp();

    try {
      await slotDao.cancelBookingAndReleaseSlot(bookingId, booking.providerId, booking.slotId);
      
      return {
        bookingId,
        state: BookingState.CANCELLED,
        cancelledAt,
        message: "Booking cancelled and slot released",
      };
    } catch (error: any) {
      if (error.name === DynamoDBErrorName.TRANSACTION_CANCELLED) {
        logger.info(
          `Booking ${bookingId} transaction cancelled`);
        throw new Error("Booking confirmation failed due to transaction conflict");
      }
      
      logger.error(`Failed to cancel booking ${bookingId}:`, error);
      throw error;
    }
  }
};