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
        ExpirationWorker[Expiration Processor<br/>Worker]
    end
    
    %% Queue Layer
    BookingQueue[SQS Booking Queue]
    BookingDLQ[SQS Dead Letter Queue]
    
    %% Data Layer
    DynamoDB[(DynamoDB<br/>Single Table Design)]
    
 
    
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
    
    EventBridge --> ExpirationWorker
    ExpirationWorker --> DynamoDB
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
    
    Note over CB: Generate bookingId<br/>Calculate expiration (5min)
    
    CB->>SD: holdSlot(providerId, slotId, bookingId)
    SD->>DB: Conditional Update<br/>SET status=HELD WHERE status=AVAILABLE
    
    alt Slot Available
        DB-->>SD: Success
        SD-->>CB: Slot held
        
        CB->>BD: createPendingBooking()
        BD->>DB: Put booking record<br/>state=PENDING
        
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

## Expiration Worker Flow

```mermaid
sequenceDiagram
    participant EB as EventBridge
    participant EW as Expiration Worker
    participant DB as DynamoDB
    participant BD as Booking DAO
    participant SD as Slot DAO
    
    Note over EB: Every 1 minute
    EB->>EW: Trigger scheduled execution
    
    EW->>DB: Query GSI3<br/>STATUS#PENDING WHERE EXPIRES < now
    DB-->>EW: List of expired bookings
    
    loop For each expired booking
        EW->>BD: expire(bookingId)
        BD->>DB: Update booking<br/>state=EXPIRED
        
        EW->>SD: releaseSlot(providerId, slotId, bookingId)
        SD->>DB: Conditional Update<br/>SET status=AVAILABLE WHERE heldBy=bookingId
        
        Note over EW: Slot released back to pool
    end
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
        string holdExpiresAt "TTL (optional)"
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
```

## State Transitions

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE: Slot created
    
    AVAILABLE --> HELD: holdSlot()
    HELD --> CONFIRMED: confirmSlot()
    HELD --> AVAILABLE: releaseSlot() / expire
    
    state BOOKING_STATES {
        [*] --> PENDING: Create booking
        PENDING --> CONFIRMED: Confirm booking
        PENDING --> EXPIRED: Auto-expire (5min)
        PENDING --> CANCELLED: Cancel booking
        CONFIRMED --> CANCELLED: Cancel booking
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
    
    F --> H[Send to SQS Queue]
    H --> I[Return 202 Accepted]
    
    G --> D
    
    %% Async Processing
    H --> J[SQS Worker Processes]
    J --> K[Additional Business Logic]
    
    %% Expiration Path
    I --> L{User Confirms?}
    L -->|Yes| M[Confirm Booking]
    L -->|No| N[Auto-Expire After 5min]
    
    M --> O[Slot Status: CONFIRMED]
    N --> P[Release Slot<br/>Back to AVAILABLE]
```

## API Endpoints Summary

| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/providers` | CreateProvider | Create service provider |
| POST | `/providers/{id}/availability` | CreateAvailability | Set provider availability |
| GET | `/providers/{id}/slots?date=YYYY-MM-DD` | GetSlots | Get available time slots |
| POST | `/bookings` | CreateBooking | Create new booking (PENDING) |
| POST | `/bookings/{id}/confirm` | ConfirmBooking | Confirm pending booking |
| POST | `/bookings/{id}/cancel` | CancelBooking | Cancel booking |
| GET | `/bookings/{id}` | GetBooking | Get booking details |

## Key Design Patterns

### 1. Two-Phase Booking
- **Phase 1**: Hold slot (5min expiration) + Create PENDING booking
- **Phase 2**: User confirms → CONFIRMED state

### 2. Optimistic Concurrency Control
- DynamoDB conditional updates prevent race conditions
- No distributed locks needed
- High performance under contention

### 3. Event-Driven Architecture
- SQS for async processing
- EventBridge for scheduled cleanup
- Decoupled components

### 4. Single Table Design
- All entities in one DynamoDB table
- GSIs for different access patterns
- Cost-efficient and atomic transactions

This flow diagram shows the complete system architecture, data flow, state transitions, and key design patterns used in the appointment booking system.