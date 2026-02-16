# TRIPNEST – SOURCE OF TRUTH CONTRACT
VERSION: v1.1
THIS FILE IS THE ABSOLUTE SOURCE OF TRUTH.
NO FIELD, ENUM OR TYPE MAY BE CHANGED WITHOUT VERSION UPDATE.

------------------------------------------------------------
GLOBAL RULES (MANDATORY)
------------------------------------------------------------

1. All dates MUST follow the exact format specified.
2. Field names are CASE-SENSITIVE.
3. Enums MUST use EXACT values defined here.
4. No additional fields may be added unless contract version changes.
5. No field may be renamed.
6. No enum value may be modified (example: "canceled" must NOT become "cancelled").
7. Status of Trip is DERIVED, never manually stored.

------------------------------------------------------------
DATE FORMATS (STRICT)
------------------------------------------------------------

ISO_DATE       = YYYY-MM-DD        (example: 2025-07-12)
ISO_DATETIME   = YYYY-MM-DDTHH:mm:ss.sssZ
TIME_HH_MM     = HH:mm (24h format, example: 14:30)

------------------------------------------------------------
ENUMS (EXACT VALUES ONLY)
------------------------------------------------------------

TripStatus:
- planned
- ongoing
- completed

ReservationType:
- flight
- hotel
- car
- train
- bus
- restaurant
- tour
- other

ReservationStatus:
- confirmed
- pending
- canceled

WorkspaceRole:
- owner
- admin
- editor
- viewer

TripRole:
- trip_admin
- trip_editor
- trip_viewer

------------------------------------------------------------
PLAN RULES
------------------------------------------------------------

Plan: free
- activeTripsMax = 2
- participantsPerTripMax = 3

Plan: pro
- activeTripsMax = unlimited
- participantsPerTripMax = unlimited

Plan: family
- activeTripsMax = unlimited
- participantsPerTripMax = unlimited
- workspaceMembersMax = 6

Definition:
Active Trip = TripStatus is "planned" OR "ongoing"

------------------------------------------------------------
TRIP STATUS DERIVATION (MANDATORY LOGIC)
------------------------------------------------------------

IF startDate > today → status = planned
IF today BETWEEN startDate AND endDate → status = ongoing
IF endDate < today → status = completed

Status MUST NOT be manually assigned.

------------------------------------------------------------
ENTITIES (STRICT SCHEMA)
------------------------------------------------------------

User
- id: uuid
- name: string
- email: string
- createdAt: ISO_DATETIME

Workspace
- id: uuid
- name: string
- ownerUserId: uuid
- planId: string
- createdAt: ISO_DATETIME

Trip
- id: uuid
- workspaceId: uuid
- name: string
- destination: string
- startDate: ISO_DATE
- endDate: ISO_DATE
- coverImageUrl: string (optional)   <-- ADDED IN v1.1
- createdAt: ISO_DATETIME
- updatedAt: ISO_DATETIME

ItineraryDay
- id: uuid
- tripId: uuid
- date: ISO_DATE
- title: string (optional)
- createdAt: ISO_DATETIME

Activity
- id: uuid
- dayId: uuid
- title: string
- timeStart: TIME_HH_MM (optional)
- timeEnd: TIME_HH_MM (optional)
- locationName: string (optional)
- address: string (optional)
- mapUrl: string (optional)
- cost: number (optional)
- currency: string (optional)
- notes: string (optional)
- orderIndex: number
- createdAt: ISO_DATETIME
- updatedAt: ISO_DATETIME

Reservation
- id: uuid
- tripId: uuid
- type: ReservationType
- title: string
- provider: string (optional)
- confirmationCode: string (optional)
- startDateTime: ISO_DATETIME
- endDateTime: ISO_DATETIME (optional)
- address: string (optional)
- mapUrl: string (optional)
- price: number (optional)
- currency: string
- status: ReservationStatus
- attachmentFileId: uuid (optional)
- notes: string (optional)
- createdAt: ISO_DATETIME
- updatedAt: ISO_DATETIME

FileMeta
- id: uuid
- workspaceId: uuid
- ownerUserId: uuid
- path: string
- mimeType: string
- sizeBytes: number
- originalName: string
- createdAt: ISO_DATETIME

------------------------------------------------------------
VALIDATION RULES (MANDATORY)
------------------------------------------------------------

1. Trip.endDate MUST be >= Trip.startDate
2. Reservation.endDateTime MUST be >= Reservation.startDateTime (if provided)
3. Trips with past dates ARE allowed
4. Completed trips MUST NOT trigger reminders
5. Free plan MUST block creation of more than 2 active trips

------------------------------------------------------------
API ERROR FORMAT (STANDARD)
------------------------------------------------------------

{
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "details": {}
}

Allowed Error Codes:
- UNAUTHORIZED
- FORBIDDEN
- NOT_FOUND
- VALIDATION_ERROR
- PLAN_LIMIT_REACHED
- INTERNAL_ERROR

------------------------------------------------------------
END OF CONTRACT
------------------------------------------------------------
