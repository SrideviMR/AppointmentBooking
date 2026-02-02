// Booking Types
import { BookingState } from "../types/enums"
export interface Booking {
  PK: string; // BOOKING#{bookingId}
  SK: string; // METADATA
  providerId: string;
  slotId: string; // date#time
  userId: string;
  state: BookingState;
  createdAt: string;
  expiresAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  // GSI Keys
  GSI1PK: string; // USER#{userId}
  GSI1SK: string; // BOOKING#{createdAt}
  GSI2PK: string; // PROVIDER#{providerId}
  GSI2SK: string; // BOOKING#{createdAt}
  GSI3PK: string; // STATUS#{state}
  GSI3SK: string; // EXPIRES#{expiresAt}
}

export interface CreateBookingInput {
  providerId: string;
  slotId: string; // date#time (e.g., "2026-02-10#10:00")
  userId: string;
}

export interface CreateBookingResponse {
  bookingId: string;
  status: BookingState;
  expiresAt: string;
}

// SQS Message Types
export interface BookingQueueMessage {
  bookingId: string;
  providerId: string;
  slotId: string;
  userId: string;
  timestamp: string;
}


export interface CancelBookingRequest {
  bookingId: string;
}

export interface CancelBookingResult {
  bookingId: string;
  state: BookingState.CANCELLED;
  cancelledAt: string;
  message: string;
}

export interface ConfirmBookingRequest {
  bookingId: string;
}

export interface ConfirmBookingResult {
  bookingId: string;
  state: BookingState.CONFIRMED;
  confirmedAt: string;
  message: string;
}

export class BookingNotFoundError extends Error {
    constructor(bookingId: string) {
      super(`Booking not found: ${bookingId}`);
      this.name = "BookingNotFoundError";
    }
  }
  
  export class SlotUnavailableError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "SlotUnavailableError";
    }
  }

  export class BookingConflictError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "BookingConflictError";
    }
  }
  