export enum BookingState {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED"
}

export enum SlotStatus {
  AVAILABLE = "AVAILABLE",
  HELD = "HELD",
  RESERVED = "RESERVED"
}

export enum DynamoDBErrorName {
  TRANSACTION_CANCELLED = "TransactionCanceledException",
  CONDITIONAL_CHECK_FAILED = "ConditionalCheckFailedException",
  PROVISIONED_THROUGHPUT_EXCEEDED = "ProvisionedThroughputExceededException",
  THROTTLING_EXCEPTION = "ThrottlingException",
  INTERNAL_SERVER_ERROR = "InternalServerError"
}