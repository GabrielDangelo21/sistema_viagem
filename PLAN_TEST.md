# TRIPNEST – TEST PLAN
Version: v1.0
Scope: Frontend + services/api.ts (in-memory backend simulation)

This document defines the official manual validation process.
All tests must follow CONTRACT.md strictly.

------------------------------------------------------------
1. GLOBAL VALIDATION
------------------------------------------------------------

[ ] App runs without console errors
[ ] No TypeScript errors
[ ] No broken imports
[ ] All API errors follow standard error shape:
    {
      code: string,
      message: string,
      details?: object
    }

------------------------------------------------------------
2. DATE FORMAT VALIDATION
------------------------------------------------------------

Trip:
[ ] startDate format = YYYY-MM-DD
[ ] endDate format = YYYY-MM-DD
[ ] endDate >= startDate

Reservation:
[ ] startDateTime = ISO_DATETIME
[ ] endDateTime (if present) >= startDateTime
[ ] Invalid format throws VALIDATION_ERROR

------------------------------------------------------------
3. TRIP STATUS DERIVATION
------------------------------------------------------------

Create 3 trips:

A) Future trip
[ ] status derived as "planned"

B) Trip including today
[ ] status derived as "ongoing"

C) Past trip
[ ] status derived as "completed"

[ ] Status is never editable manually
[ ] Status updates correctly after date changes

------------------------------------------------------------
4. FREE PLAN LIMIT (CRITICAL TEST)
------------------------------------------------------------

Workspace plan = free

Scenario A:
[ ] Create 2 active trips (planned or ongoing)
[ ] Attempt to create a 3rd active trip
[ ] Must return PLAN_LIMIT_REACHED

Scenario B:
[ ] With 2 active trips, create a past trip
[ ] Must be allowed (completed)

Scenario C:
[ ] Update a completed trip to future dates
[ ] Must block if activeTrips > 2

------------------------------------------------------------
5. DELETE TRIP
------------------------------------------------------------

[ ] Delete an active trip
[ ] Trip removed from list
[ ] Related ItineraryDays removed
[ ] Related Activities removed
[ ] Related Reservations removed
[ ] activeTripsCount recalculated
[ ] Can create new trip after deletion if under limit
[ ] Deleting non-existing trip returns NOT_FOUND

------------------------------------------------------------
6. ITINERARY TESTS
------------------------------------------------------------

Auto-generate:
[ ] Days created match date interval
[ ] Replace mode deletes old days
[ ] Append mode only creates missing days

Activities:
[ ] First activity orderIndex = 0
[ ] Sequential order maintained
[ ] Reorder updates orderIndex sequentially
[ ] Invalid reorder returns VALIDATION_ERROR

------------------------------------------------------------
7. RESERVATION TESTS
------------------------------------------------------------

Create:
[ ] Valid reservation created successfully
[ ] Invalid date range returns VALIDATION_ERROR

Update:
[ ] Status update works
[ ] Invalid enum rejected

List:
[ ] Only reservations for selected trip returned

------------------------------------------------------------
8. FILE TESTS
------------------------------------------------------------

Upload:
[ ] presignUpload returns fake URL
[ ] FileMeta stored in memory

Download:
[ ] presignDownload returns temporary URL
[ ] Invalid fileId returns NOT_FOUND

------------------------------------------------------------
9. AUTH SIMULATION
------------------------------------------------------------

When authEnabled = true and no currentUser:
[ ] All endpoints return UNAUTHORIZED

------------------------------------------------------------
10. LATENCY & INTERNAL ERROR
------------------------------------------------------------

[ ] All API calls simulate delay
[ ] Random INTERNAL_ERROR occasionally occurs
[ ] UI handles error without crash

------------------------------------------------------------
11. UI FLOW TESTS
------------------------------------------------------------

Dashboard:
[ ] "Reservas" opens TripDetails on reservations tab
[ ] "Checklists" opens "Em breve" modal

Trips Page:
[ ] Create trip works
[ ] Edit trip works
[ ] Delete trip confirmation modal works

Trip Details:
[ ] Tabs switch correctly
[ ] Activities update in real time
[ ] Reservations update in real time

------------------------------------------------------------
12. REGRESSION CHECK
------------------------------------------------------------

After implementing delete:
[ ] Free limit still enforced
[ ] No orphan activities
[ ] No orphan reservations
[ ] No console errors

------------------------------------------------------------
TEST APPROVAL CRITERIA
------------------------------------------------------------

The MVP is considered stable when:

✔ All critical monetization rules pass
✔ No unhandled promise rejections
✔ No invalid enum values appear
✔ No date format mismatch exists
✔ All API errors follow contract
✔ Free plan limit cannot be bypassed
✔ Trip status is always derived

------------------------------------------------------------
END OF TEST PLAN
------------------------------------------------------------