export type SlotStatus = "AVAILABLE" | "RESERVED" | "BOOKED";

export interface Slot {
  PK: string; // PROVIDER#{providerId}
  SK: string; // SLOT#{date}#{time}
  status: SlotStatus;
  reservedBy?: string;
  reservedAt?: string;
}

export interface GetSlotsQuery {
  date: string;
}

export interface TimeSlot {
    time: string;
    available: boolean;
    reservedBy?: string;
  }
  