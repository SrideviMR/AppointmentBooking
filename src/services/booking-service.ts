import { bookingDao } from "../dao/booking-dao";
import { slotDao } from "../dao/slot-dao";
import { getCurrentTimestamp, generateExpirationTime } from "../utils/time";
import { randomUUID } from "crypto";
import { sendMessage } from "../utils/sqs";
import { queryItems } from "../utils/dynamodb";
import { Slot } from "../types/slot";
import { BookingQueueMessage } from "../types/booking";

const QUEUE_URL = process.env.BOOKING_QUEUE_URL!;

export interface CreateBookingRequest {
  providerId: string;
  slotId: string;
  userId: string;
}

export interface CreateBookingResult {
  bookingId: string;
  status: "PENDING";
  expiresAt: string;
}

export interface CancelBookingRequest {
  bookingId: string;
}

export interface CancelBookingResult {
  bookingId: string;
  state: "CANCELLED";
  cancelledAt: string;
  message: string;
}

export interface ConfirmBookingRequest {
  bookingId: string;
}

export interface ConfirmBookingResult {
  bookingId: string;
  state: "CONFIRMED";
  confirmedAt: string;
  message: string;
}

export class BookingNotFoundError extends Error {
  constructor(bookingId: string) {
    super(`Booking not found: ${bookingId}`);
    this.name = "BookingNotFoundError";
  }
}

export class BookingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingConflictError";
  }
}

export class ServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}

export class SlotUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlotUnavailableError";
  }
}

export const bookingService = {
  async createBooking({ providerId, slotId, userId }: CreateBookingRequest): Promise<CreateBookingResult> {
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
    if (slot.status === "HELD" && slot.holdExpiresAt && new Date(slot.holdExpiresAt) > new Date()) {
      throw new SlotUnavailableError(`Slot is held by another user until ${slot.holdExpiresAt}`);
    } else if (slot.status === "BOOKED") {
      throw new SlotUnavailableError("Slot is already booked. Please select another slot.");
    }
    
    const bookingId = `booking-${randomUUID()}`;
    const expiresAt = generateExpirationTime(5);

    // Hold slot atomically
    try {
      const held = await slotDao.holdSlot(providerId, slotId, bookingId, expiresAt);
      if (!held) {
        throw new SlotUnavailableError("Slot is held by another booking");
      }
    } catch (err: any) {
      if (err.name === "ConditionalCheckFailedException") {
        throw new SlotUnavailableError("Slot is held by another booking");
      }
      if (err.name === "ProvisionedThroughputExceededException" || err.name === "ThrottlingException") {
        throw new ServiceUnavailableError("Service temporarily unavailable. Please try again.");
      }
      throw err;
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
      throw new ServiceUnavailableError(error.message);
    }

    return {
      bookingId,
      status: "PENDING",
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
        state: "CONFIRMED",
        confirmedAt,
        message: "Booking confirmed successfully",
      };
    } catch (error: any) {
      if (error.name === "TransactionCanceledException") {
        const cancellationReasons = error.CancellationReasons || [];
        
        const bookingConditionFailed = cancellationReasons.some(
          (reason: any, index: number) => reason.Code === "ConditionalCheckFailed" && index === 0
        );
        const slotConditionFailed = cancellationReasons.some(
          (reason: any, index: number) => reason.Code === "ConditionalCheckFailed" && index === 1
        );
        
        if (bookingConditionFailed) {
          throw new BookingConflictError(
            `Booking cannot be confirmed. Current state: ${booking.state}`
          );
        }
        
        if (slotConditionFailed) {
          throw new BookingConflictError("Slot is no longer held by this booking");
        }
        
        throw new BookingConflictError("Booking confirmation failed due to conflicting state");
      }
      
      if (error.name === "ProvisionedThroughputExceededException" || error.name === "ThrottlingException") {
        throw new ServiceUnavailableError("Service temporarily unavailable. Please try again.");
      }
      
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
        state: "CANCELLED",
        cancelledAt,
        message: "Booking cancelled and slot released",
      };
    } catch (error: any) {
      if (error.name === "TransactionCanceledException") {
        const cancellationReasons = error.CancellationReasons || [];
        
        const bookingConditionFailed = cancellationReasons.some(
          (reason: any, index: number) => reason.Code === "ConditionalCheckFailed" && index === 0
        );
        const slotConditionFailed = cancellationReasons.some(
          (reason: any, index: number) => reason.Code === "ConditionalCheckFailed" && index === 1
        );
        
        if (bookingConditionFailed) {
          throw new BookingConflictError(
            `Booking cannot be cancelled. Current state: ${booking.state}`
          );
        }
        
        if (slotConditionFailed) {
          throw new BookingConflictError("Slot is no longer held by this booking");
        }
        
        throw new BookingConflictError("Booking cancellation failed due to conflicting state");
      }
      
      if (error.name === "ProvisionedThroughputExceededException" || error.name === "ThrottlingException") {
        throw new ServiceUnavailableError("Service temporarily unavailable. Please try again.");
      }
      
      throw error;
    }
  }
};