// Booking Types
export type BookingState = "PENDING" | "CONFIRMED" | "EXPIRED" | "CANCELLED";

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

