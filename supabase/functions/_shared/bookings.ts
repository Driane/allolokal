// Création d'une réservation à partir d'un paiement Stripe réussi.
// Appelée par confirm-booking (retour du navigateur) ET par stripe-webhooks (filet de sécurité) :
// le premier arrivé crée la réservation, le second retrouve la même grâce à payment_intent_id (unique).
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const RECURRENCE_INTERVALS = ['weekly', 'biweekly', 'monthly'] as const
export type RecurrenceInterval = typeof RECURRENCE_INTERVALS[number]

const INTERVAL_DAYS: Record<RecurrenceInterval, number> = { weekly: 7, biweekly: 14, monthly: 30 }
const MAX_FUTURE_OCCURRENCES = 60

export const BOOKING_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export class SlotTakenError extends Error {
  constructor() {
    super("Ce créneau vient d'être pris par quelqu'un d'autre. Votre paiement a été remboursé.")
  }
}

interface BookingPaymentIntent {
  id: string
  amount: number
  metadata: Record<string, string>
}

interface BookingExtras {
  note?: string | null
  imageUrl?: string | null
}

export async function createBookingFromPayment(
  supabaseAdmin: SupabaseClient,
  pi: BookingPaymentIntent,
  refundPayment: (paymentIntentId: string) => Promise<unknown>,
  extras: BookingExtras = {},
) {
  const m = pi.metadata
  if (m.kind !== 'booking') throw new Error('Ce paiement ne correspond pas à une réservation.')

  // 1. Idempotence : ce paiement a-t-il déjà produit sa réservation ?
  const existing = await findBookingByPayment(supabaseAdmin, pi.id)
  if (existing) return existing

  // 2. Le créneau a pu être pris entre le paiement et la confirmation : on rembourse
  const { data: conflicts } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('pro_id', m.proId)
    .neq('status', 'cancelled')
    .eq('booking_date', m.bookingDate)
    .limit(1)

  if (conflicts && conflicts.length > 0) {
    await refundPayment(pi.id)
    throw new SlotTakenError()
  }

  // 3. Toutes les valeurs viennent du paiement (fixées côté serveur), jamais du navigateur
  const isRecurring = m.isRecurring === 'true'
  const recurrenceInterval = isRecurring ? m.recurrenceInterval as RecurrenceInterval : null
  const recurrenceEndDate = isRecurring && m.recurrenceEndDate ? m.recurrenceEndDate : null

  const baseBooking = {
    service_id:          m.serviceId,
    client_id:           m.clientId,
    pro_id:              m.proId,
    booking_date:        m.bookingDate,
    duration:            Number(m.hours),
    total_price:         pi.amount / 100,
    notes:               extras.note ?? null,
    image_url:           extras.imageUrl ?? null,
    is_recurring:        isRecurring,
    recurrence_interval: recurrenceInterval,
  }

  const { data: firstBooking, error } = await supabaseAdmin
    .from('bookings')
    .insert({ ...baseBooking, status: 'pending', payment_status: 'paid', payment_intent_id: pi.id })
    .select()
    .single()

  if (error) {
    // Course entre le webhook et confirm-booking : l'autre appel vient de créer la réservation
    if (error.code === '23505') {
      const created = await findBookingByPayment(supabaseAdmin, pi.id)
      if (created) return created
    }
    throw error
  }

  // 4. Occurrences futures d'une réservation récurrente (paiement programmé)
  if (recurrenceInterval && recurrenceEndDate) {
    const seriesId = firstBooking.id
    await supabaseAdmin
      .from('bookings')
      .update({ recurrence_series_id: seriesId, recurrence_end_date: recurrenceEndDate })
      .eq('id', seriesId)

    const [day, time] = m.bookingDate.split('T')
    const end = new Date(`${recurrenceEndDate}T00:00:00Z`)
    const next = new Date(`${day}T00:00:00Z`)
    const futureBookings = []

    while (futureBookings.length < MAX_FUTURE_OCCURRENCES) {
      next.setUTCDate(next.getUTCDate() + INTERVAL_DAYS[recurrenceInterval])
      if (next > end) break
      futureBookings.push({
        ...baseBooking,
        booking_date:         `${next.toISOString().slice(0, 10)}T${time}`,
        status:               'pending',
        payment_status:       'scheduled',
        recurrence_series_id: seriesId,
        recurrence_end_date:  recurrenceEndDate,
      })
    }

    if (futureBookings.length > 0) {
      const { error: futureError } = await supabaseAdmin.from('bookings').insert(futureBookings)
      if (futureError) throw futureError
    }
  }

  return firstBooking
}

async function findBookingByPayment(supabaseAdmin: SupabaseClient, paymentIntentId: string) {
  const { data } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('payment_intent_id', paymentIntentId)
    .maybeSingle()
  return data
}
