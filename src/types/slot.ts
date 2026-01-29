export type SlotStatus = "AVAILABLE" | "HELD" | "BOOKED";

export interface Slot {
  PK: string; // PROVIDER#{providerId}
  SK: string; // SLOT#{date}#{time}
  status: SlotStatus;
  reservedBy?: string;
  reservedAt?: string;
  heldBy?: string;          // bookingId that holds this slot
  holdExpiresAt?: string;  
}

export interface GetSlotsQuery {
  date: string;
}

export interface TimeSlot {
    time: string;
    available: boolean;
    reservedBy?: string;
  }
  