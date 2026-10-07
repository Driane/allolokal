// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { BOOKING_DATE_RE, DATE_RE, RECURRENCE_INTERVALS } from '../_shared/bookings.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Durées proposées par BookingPage pour un service facturé à l'heure
const ALLOWED_HOURS = [1, 2, 3, 4, 5]

const toCents = (euros: unknown) => Math.round(Number(euros) * 100)

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Le client est celui du JWT, jamais un identifiant envoyé dans le body
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) throw new Error('Unauthorized')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')
    const clientId = user.id

    const { serviceId, duration, addonIds, bookingDate, isRecurring, recurrenceInterval, recurrenceEndDate } = await req.json()
    if (typeof serviceId !== 'string') throw new Error('Service invalide.')
    if (typeof bookingDate !== 'string' || !BOOKING_DATE_RE.test(bookingDate)) throw new Error('Créneau invalide.')

    const recurring = isRecurring === true
    if (recurring && !RECURRENCE_INTERVALS.includes(recurrenceInterval)) throw new Error('Récurrence invalide.')
    const recurrenceEnd = recurring && typeof recurrenceEndDate === 'string' && recurrenceEndDate !== '' ? recurrenceEndDate : ''
    if (recurrenceEnd && !DATE_RE.test(recurrenceEnd)) throw new Error('Date de fin de récurrence invalide.')

    // 2. Le prix vient de la base : service, durée et options sont revérifiés ici
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('id, user_id, price, price_unit, price_type, is_active')
      .eq('id', serviceId)
      .single()

    if (serviceError || !service) throw new Error('Service introuvable.')
    if (service.is_active === false) throw new Error("Ce service n'est plus disponible.")
    if (service.user_id === clientId) throw new Error('Vous ne pouvez pas réserver votre propre service.')

    const isHourly = service.price_unit === 'hour' || service.price_type === 'hourly'
    const hours = isHourly ? Number(duration) : 1
    if (!ALLOWED_HOURS.includes(hours)) throw new Error('Durée invalide.')

    const requestedAddonIds: string[] = Array.isArray(addonIds) ? [...new Set(addonIds as string[])] : []
    let addonsTotal = 0
    if (requestedAddonIds.length > 0) {
      const { data: addons, error: addonsError } = await supabaseAdmin
        .from('service_addons')
        .select('id, price')
        .eq('service_id', service.id)
        .in('id', requestedAddonIds)

      if (addonsError || !addons || addons.length !== requestedAddonIds.length) {
        throw new Error('Option invalide pour ce service.')
      }
      addonsTotal = addons.reduce((sum, a) => sum + toCents(a.price), 0)
    }

    const amountInCentimes = toCents(service.price) * hours + addonsTotal
    if (!Number.isInteger(amountInCentimes) || amountInCentimes <= 0) {
      throw new Error('Montant invalide.')
    }

    // 3. Récupérer le Stripe Account ID du Pro
    const proId = service.user_id
    const { data: proProfile, error: proError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_connect_id, is_paused_for_dispute')
      .eq('id', proId)
      .single()

    if (proError || !proProfile?.stripe_connect_id) {
      throw new Error("Le professionnel n'est pas configuré pour recevoir des paiements.")
    }
    if (proProfile.is_paused_for_dispute) {
      throw new Error('Ce prestataire est temporairement indisponible suite à un litige en cours.')
    }

    // Ne pas encaisser un créneau déjà pris (revérifié à la confirmation, avec remboursement)
    const { data: conflicts } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('pro_id', proId)
      .neq('status', 'cancelled')
      .eq('booking_date', bookingDate)
      .limit(1)
    if (conflicts && conflicts.length > 0) {
      throw new Error("Ce créneau vient d'être pris par quelqu'un d'autre. Veuillez en choisir un autre.")
    }

    // 4. Calcul de la commission (9% client récurrent, 14% sinon) + 25% de taxe sur la commission
    const { count } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('pro_id', proId)
      .eq('client_id', clientId)
      .eq('status', 'completed')

    const isRepeated = count !== null && count > 0
    const baseRate = isRepeated ? 0.09 : 0.14

    const platformCommission = amountInCentimes * baseRate
    const taxOnCommission = platformCommission * 0.25
    const totalApplicationFee = Math.round(platformCommission + taxOnCommission)

    // 5. Créer le Payment Intent sur Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCentimes,
      currency: 'eur',
      transfer_data: {
        destination: proProfile.stripe_connect_id,
      },
      application_fee_amount: totalApplicationFee,
      // La réservation sera créée côté serveur à partir de ces métadonnées (confirm-booking / webhook)
      metadata: {
        kind: 'booking',
        clientId,
        proId,
        serviceId: service.id,
        hours: String(hours),
        bookingDate,
        isRecurring: String(recurring),
        recurrenceInterval: recurring ? recurrenceInterval : '',
        recurrenceEndDate: recurrenceEnd,
        isRepeated: String(isRepeated)
      }
    })

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amountInCentimes,
        details: {
          rate: (baseRate * 100).toFixed(0) + "%",
          isRepeated,
          totalFee: totalApplicationFee / 100
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    const err = error as Error;
    const status = err.message === 'Unauthorized' ? 401 : 400
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
    )
  }
})
