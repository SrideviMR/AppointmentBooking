// Provider Types
export type ProviderType = "DOCTOR" | "SALON" | "SERVICE";

export interface Provider {
  PK: string; // PROVIDER#{providerId}
  SK: string; // METADATA
  providerName: string;
  providerType: ProviderType;
  createdAt: string;
}

export interface CreateProviderInput {
  providerId: string;
  providerName: string;
  providerType: ProviderType;
}

// Availability Types
export interface Availability {
  PK: string; // PROVIDER#{providerId}
  SK: string; // AVAILABILITY#{date}
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  createdAt: string;
}

export interface CreateAvailabilityInput {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  slotDurationMinutes: number;
}

// Slot Types
export type SlotStatus = "AVAILABLE" | "RESERVED" | "BOOKED";

export interface Slot {
  PK: string; // PROVIDER#{providerId}
  SK: string; // SLOT#{date}#{time}
  status: SlotStatus;
  reservedBy?: string; // bookingId
  reservedAt?: string;
}

export interface GetSlotsQuery {
  date: string;
}

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

// API Response Types
export interface ApiResponse<T = any> {
  statusCode: number;
  body: string;
  headers: {
    "Content-Type": string;
    "Access-Control-Allow-Origin": string;
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
}

// DynamoDB Key Builders
export const Keys = {
  provider: (providerId: string) => ({
    PK: `PROVIDER#${providerId}`,
    SK: "METADATA",
  }),
  availability: (providerId: string, date: string) => ({
    PK: `PROVIDER#${providerId}`,
    SK: `AVAILABILITY#${date}`,
  }),
  slot: (providerId: string, date: string, time: string) => ({
    PK: `PROVIDER#${providerId}`,
    SK: `SLOT#${date}#${time}`,
  }),
  booking: (bookingId: string) => ({
    PK: `BOOKING#${bookingId}`,
    SK: "METADATA",
  }),
};

// Utility Types
export interface TimeSlot {
  time: string;
  available: boolean;
  reservedBy?: string;
}



