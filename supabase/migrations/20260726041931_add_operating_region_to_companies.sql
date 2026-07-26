/*
# Add operating_region to companies

## Summary
Adds an `operating_region` column to the `companies` table so each employer can record
the geographic region they operate in (e.g. Alberta, Ontario, Canada-only, US-only,
Cross-Border). This is shown on company cards instead of the branding color swatches.

## Changes
- New column `operating_region` (text, nullable) on `companies`.
- No security changes; existing RLS policies already cover the new column.

## Notes
- The column is optional but recommended; the admin sets it when creating/editing a company.
- It is displayed first on company cards, before the city/province, to remove ambiguity
  about where the employer actually operates vs. where they are physically located.
*/

ALTER TABLE companies ADD COLUMN IF NOT EXISTS operating_region text;
