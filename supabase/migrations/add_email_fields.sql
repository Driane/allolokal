-- Migration: email system support
-- Run this in the Supabase SQL Editor

-- Track whether the 24h review request email has been sent for a booking
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS review_email_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- Index to make the scheduled query fast
CREATE INDEX IF NOT EXISTS idx_bookings_review_email
  ON bookings (booking_date, status, payment_status, review_email_sent)
  WHERE review_email_sent = FALSE;
