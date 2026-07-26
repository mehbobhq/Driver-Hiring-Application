/*
# Enforce operating_region as required with a fixed set of values

## Summary
The `operating_region` column on `companies` was added as a nullable free-text field.
The admin UI already requires it when creating/editing a company, but the database
itself did not enforce this, so it was possible for a row to exist with a NULL or
arbitrary value. This migration locks the column down to match the three supported
values used throughout the app (company records, tenant state, and the driver
invitation "smart lock" logic).

## Changes
- Backfill any existing NULL `operating_region` values to 'Cross-Border', the least
  restrictive option, so no existing company loses the ability to receive any driver
  type until an admin explicitly narrows it.
- Add a CHECK constraint restricting `operating_region` to exactly:
  'Canada Only', 'US Only', 'Cross-Border'.
- Set the column to NOT NULL.

## Notes
- No RLS changes; existing policies already cover this column.
- This is additive/corrective and does not remove any data.
*/

UPDATE companies
SET operating_region = 'Cross-Border'
WHERE operating_region IS NULL;

ALTER TABLE companies
  ALTER COLUMN operating_region SET NOT NULL;

ALTER TABLE companies
  ADD CONSTRAINT companies_operating_region_check
  CHECK (operating_region IN ('Canada Only', 'US Only', 'Cross-Border'));
