# Appointment Booking System - Flow Diagram

## System Architecture Overview

```mermaid
graph TB
    %% External Layer
    Client[Client Application]
    
    %% API Gateway Layer
    API[API Gateway<br/>REST Endpoints]
    
    %% Lambda Functions Layer
    subgraph "Lambda Functions"
        CreateProvider[Create Provider<br/>Handler]
        CreateAvail[Create Availability<br/>Handler]
        GetSlots[Get Slots<br/>Handler]
        CreateBooking[Create Booking<br/>Handler]
        ConfirmBooking[Confirm Booking<br/>Handler]
        CancelBooking[Cancel Booking<br/>Handler]
        GetBooking[Get Booking<br/>Handler]
    end
    
    %% Worker Layer
    subgraph "Background Workers"
        BookingWorker[Booking Processor<br/>Worker]
        ExpirationProcessor[Expiration Processor<br/>Stream Handler]
    end
    
    %% Queue Layer
    BookingQueue[SQS Booking Queue]
    BookingDLQ[SQS Dead Letter Queue]
    
    %% Data Layer
    DynamoDB[(DynamoDB<br/>Single Table Design<br/>+ TTL Enabled)]
    DDBStream[DynamoDB Streams<br/>TTL Deletions]
    
    %% Connections
    Client --> API
    
    API --> CreateProvider
    API --> CreateAvail
    API --> GetSlots
    API --> CreateBooking
    API --> ConfirmBooking
    API --> CancelBooking
    API --> GetBooking
    
    CreateProvider --> DynamoDB
    CreateAvail --> DynamoDB
    GetSlots --> DynamoDB
    CreateBooking --> DynamoDB
    CreateBooking --> BookingQueue
    ConfirmBooking --> DynamoDB
    CancelBooking --> DynamoDB
    GetBooking --> DynamoDB
    
    BookingQueue --> BookingWorker
    BookingQueue --> BookingDLQ
    BookingWorker --> DynamoDB
    
    DynamoDB -->|TTL Deletion Events| DDBStream
    DDBStream --> ExpirationProcessor
    ExpirationProcessor --> DynamoDB
```

## Detailed Booking Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Gateway
    participant CB as Create Booking
    participant SD as Slot DAO
    participant BD as Booking DAO
    participant SQS as SQS Queue
    participant BW as Booking Worker
    participant DB as DynamoDB
    
    %% Booking Creation Flow
    C->>API: POST /bookings
    API->>CB: Invoke Handler
    
    Note over CB: Generate bookingId<br/>Calculate expiration (5min)<br/>TTL = now + 300s
    
    CB->>SD: holdSlot(providerId, slotId, bookingId)
    SD->>DB: Conditional Update<br/>SET status=HELD WHERE status=AVAILABLE
    
    alt Slot Available
        DB-->>SD: Success
        SD-->>CB: Slot held
        
        CB->>BD: createPendingBooking()
        BD->>DB: Put booking record<br/>state=PENDING
        
        Note over BD: Create EXPIRATION_TRIGGER<br/>PK=BOOKING#bookingId<br/>SK=EXPIRATION_TRIGGER<br/>TTL=expiresAt
        
        BD->>DB: Put expiration trigger item
        
        CB->>SQS: Send booking message
        CB-->>API: 202 Accepted<br/>{bookingId, status: PENDING}
        API-->>C: Response
        
        %% Async Processing
        SQS->>BW: Trigger worker
        BW->>DB: Process booking<br/>(Additional business logic)
        
    else Slot Unavailable
        DB-->>SD: ConditionalCheckFailedException
        SD-->>CB: Slot already taken
        CB-->>API: 400 Validation Error
        API-->>C: Slot unavailable
    end
```

## Booking Confirmation Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Gateway
    participant CF as Confirm Booking
    participant BD as Booking DAO
    participant SD as Slot DAO
    participant DB as DynamoDB
    
    C->>API: POST /bookings/{id}/confirm
    API->>CF: Invoke Handler
    
    CF->>BD: getBookingById(bookingId)
    BD->>DB: Get booking record
    DB-->>BD: Booking data
    BD-->>CF: Booking object
    
    alt Booking Found & PENDING
        CF->>SD: confirmSlot(providerId, slotId, bookingId)
        SD->>DB: Conditional Update<br/>SET status=CONFIRMED WHERE status=HELD AND heldBy=bookingId
        
        alt Slot Still Held
            DB-->>SD: Success
            SD-->>CF: Slot confirmed
            
            CF->>BD: confirm(bookingId)
            BD->>DB: Update booking<br/>state=CONFIRMED, confirmedAt=now
            
            Note over BD: Delete EXPIRATION_TRIGGER<br/>(no longer needed)
            BD->>DB: Delete expiration trigger
            
            CF-->>API: 200 Success
            API-->>C: Booking confirmed
            
        else Slot No Longer Held
            DB-->>SD: ConditionalCheckFailedException
            SD-->>CF: Slot not held
            CF-->>API: 409 Conflict
            API-->>C: Slot no longer available
        end
        
    else Booking Not Found
        CF-->>API: 404 Not Found
        API-->>C: Booking not found
    end
```

## TTL Expiration Flow (DynamoDB Streams)

```mermaid
sequenceDiagram
    participant DB as DynamoDB
    participant TTL as TTL Process
    participant Stream as DDB Streams
    participant EP as Expiration Processor
    participant SD as Slot DAO
    
    Note over DB: EXPIRATION_TRIGGER item<br/>TTL timestamp reached
    
    TTL->>DB: Delete expired item
    DB->>Stream: REMOVE event<br/>SK=EXPIRATION_TRIGGER
    
    Stream->>EP: Trigger Lambda
    
    Note over EP: Extract from OldImage:<br/>bookingId, providerId, slotId
    
    EP->>SD: expireBookingAndReleaseSlot(bookingId, providerId, slotId)
    
    SD->>DB: TransactWriteItems
    Note over SD,DB: Transaction:<br/>1. Update booking state=EXPIRED<br/>2. Update slot status=AVAILABLE<br/>WHERE heldBy=bookingId
    
    alt Transaction Succeeds
        DB-->>SD: Success
        SD-->>EP: Booking expired, slot released
        Note over EP: Log success
        
    else Transaction Fails
        DB-->>SD: TransactionCanceledException
        SD-->>EP: Already processed or not held
        Note over EP: Log and skip<br/>(idempotent)
    end
```

## Expiration Trigger Pattern

```mermaid
graph LR
    A[Create Booking] --> B[Put Booking Record<br/>state=PENDING]
    B --> C[Put Expiration Trigger<br/>PK=BOOKING#id<br/>SK=EXPIRATION_TRIGGER<br/>TTL=expiresAt<br/>bookingId, providerId, slotId]
    
    C --> D{Wait for TTL}
    
    D -->|Time Expires| E[DynamoDB TTL<br/>Deletes Trigger]
    D -->|User Confirms| F[Delete Trigger Manually<br/>Cancel Expiration]
    
    E --> G[Stream Event<br/>REMOVE]
    G --> H[Expiration Processor<br/>Reads OldImage]
    H --> I[Expire Booking<br/>Release Slot]
    
    F --> J[Booking Confirmed<br/>No Expiration]
    
    style C fill:#e1f5ff
    style E fill:#ffe1e1
    style F fill:#e1ffe1
```

## Data Model & Key Structure

```mermaid
erDiagram
    SINGLE_TABLE {
        string PK "Partition Key"
        string SK "Sort Key"
        string GSI1PK "User bookings index"
        string GSI1SK "Booking timestamp"
        string GSI2PK "Provider bookings index"
        string GSI2SK "Booking timestamp"
        string GSI3PK "Status-based queries"
        string GSI3SK "Expiration timestamp"
        number TTL "Time-to-live attribute"
    }
    
    PROVIDER {
        string PK "PROVIDER#providerId"
        string SK "METADATA"
        string providerName
        string providerType
        string createdAt
    }
    
    AVAILABILITY {
        string PK "PROVIDER#providerId"
        string SK "AVAILABILITY#date"
        string startTime
        string endTime
        number slotDurationMinutes
        string createdAt
    }
    
    SLOT {
        string PK "PROVIDER#providerId"
        string SK "SLOT#date#time"
        string status "AVAILABLE|HELD|CONFIRMED"
        string heldBy "bookingId (optional)"
        string holdExpiresAt "ISO timestamp (optional)"
        string confirmedAt "timestamp (optional)"
    }
    
    BOOKING {
        string PK "BOOKING#bookingId"
        string SK "METADATA"
        string providerId
        string slotId "date#time"
        string userId
        string state "PENDING|CONFIRMED|EXPIRED|CANCELLED"
        string createdAt
        string expiresAt
        string confirmedAt "optional"
        string cancelledAt "optional"
        string GSI1PK "USER#userId"
        string GSI1SK "BOOKING#timestamp"
        string GSI2PK "PROVIDER#providerId"
        string GSI2SK "BOOKING#timestamp"
        string GSI3PK "STATUS#state"
        string GSI3SK "EXPIRES#expiresAt"
    }
    
    EXPIRATION_TRIGGER {
        string PK "BOOKING#bookingId"
        string SK "EXPIRATION_TRIGGER"
        string bookingId "For stream processing"
        string providerId "For stream processing"
        string slotId "For stream processing"
        number TTL "Unix timestamp (expiresAt)"
    }
```

## State Transitions

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE: Slot created
    
    AVAILABLE --> HELD: holdSlot()
    HELD --> CONFIRMED: confirmSlot()
    HELD --> AVAILABLE: TTL expiration (via Stream)
    
    state BOOKING_STATES {
        [*] --> PENDING: Create booking + TTL trigger
        PENDING --> CONFIRMED: Confirm booking (delete trigger)
        PENDING --> EXPIRED: TTL trigger fires (Stream)
        PENDING --> CANCELLED: Cancel booking
        CONFIRMED --> CANCELLED: Cancel booking
    }
    
    state TTL_TRIGGER {
        [*] --> ACTIVE: Created with booking
        ACTIVE --> FIRED: TTL expires
        ACTIVE --> DELETED: Booking confirmed
        FIRED --> [*]: Stream processed
        DELETED --> [*]: Manually removed
    }
```

## Concurrency & Error Handling

```mermaid
flowchart TD
    A[Booking Request] --> B{Slot Available?}
    
    B -->|Yes| C[Hold Slot<br/>Conditional Update]
    B -->|No| D[Return Error<br/>Slot Unavailable]
    
    C --> E{Update Success?}
    E -->|Yes| F[Create Pending Booking]
    E -->|No| G[Race Condition<br/>Slot Taken]
    
    F --> H[Create TTL Trigger Item]
    H --> I[Send to SQS Queue]
    I --> J[Return 202 Accepted]
    
    G --> D
    
    %% Async Processing
    I --> K[SQS Worker Processes]
    K --> L[Additional Business Logic]
    
    %% Expiration Path
    J --> M{User Confirms?}
    M -->|Yes| N[Confirm Booking<br/>Delete TTL Trigger]
    M -->|No| O[TTL Fires After 5min]
    
    N --> P[Slot Status: CONFIRMED]
    
    O --> Q[DynamoDB Deletes Trigger]
    Q --> R[Stream Event: REMOVE]
    R --> S[Expiration Processor Lambda]
    S --> T[TransactWrite:<br/>Expire Booking + Release Slot]
    
    T --> U{Transaction Success?}
    U -->|Yes| V[Slot Released to AVAILABLE]
    U -->|No - Already Processed| W[Idempotent Skip]
```

## API Endpoints Summary

| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/providers` | CreateProvider | Create service provider |
| POST | `/providers/{id}/availability` | CreateAvailability | Set provider availability |
| GET | `/providers/{id}/slots?date=YYYY-MM-DD` | GetSlots | Get available time slots |
| POST | `/bookings` | CreateBooking | Create new booking (PENDING) + TTL trigger |
| POST | `/bookings/{id}/confirm` | ConfirmBooking | Confirm pending booking + delete trigger |
| POST | `/bookings/{id}/cancel` | CancelBooking | Cancel booking |
| GET | `/bookings/{id}` | GetBooking | Get booking details |

## Key Design Patterns

### 1. Two-Phase Booking
- **Phase 1**: Hold slot (5min expiration) + Create PENDING booking + Create TTL trigger
- **Phase 2**: User confirms → CONFIRMED state + Delete TTL trigger

### 2. TTL + Streams Pattern
- **TTL Trigger Item**: Separate item with TTL attribute for automatic deletion
- **DynamoDB Streams**: Captures TTL deletion events
- **Stream Processor**: Reacts to deletions and performs cleanup logic
- **Idempotent Processing**: TransactWrite ensures no double-processing

### 3. Optimistic Concurrency Control
- DynamoDB conditional updates prevent race conditions
- TransactWrite for atomic booking expiration + slot release
- No distributed locks needed
- High performance under contention

### 4. Event-Driven Architecture
- SQS for async booking processing
- DynamoDB Streams for expiration handling
- Decoupled components with retry logic

### 5. Single Table Design
- All entities in one DynamoDB table
- GSIs for different access patterns
- Separate expiration trigger items for clean separation of concerns
- Cost-efficient and supports atomic transactions

## Why This Approach?

### Advantages of TTL + Streams:
1. **No polling**: DynamoDB handles deletion automatically
2. **Precise timing**: TTL is more accurate than periodic schedulers
3. **Cost-effective**: No EventBridge rules or continuous Lambda execution
4. **Scalable**: Streams process events in parallel
5. **Reliable**: Built-in retry with DLQ support
6. **Idempotent**: Transaction ensures slot released only once

### Implementation Details:
- **Expiration Trigger**: Stores metadata needed for cleanup (bookingId, providerId, slotId)
- **Stream Filter**: Only processes `REMOVE` events where `SK=EXPIRATION_TRIGGER`
- **Atomic Cleanup**: TransactWrite updates booking state AND releases slot
- **Graceful Handling**: If booking already confirmed/cancelled, transaction condition fails safely

This architecture provides automatic expiration handling without the complexity of scheduled jobs while maintaining strong consistency guarantees.
