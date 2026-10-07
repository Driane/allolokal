import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Check, Loader2 } from 'lucide-react';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../lib/stripe';
import { StripePaymentForm } from './StripePaymentForm';
import { supabase } from '../lib/supabase';

type Tier = 'essential' | 'flex' | 'plus';

interface ModalPlan {
  tier: Tier;
  name: string;
  price: number | null;
}

interface Props {
  plan: ModalPlan;
  userId: string;
  onClose: () => void;
}

function getPlanFeatures(tier: Tier, t: (k: string) => string): string[] {
  if (tier === 'flex') return [
    t('subscription.feat_flex_1'),
    t('subscription.feat_flex_2'),
    t('subscription.feat_flex_3'),
  ];
  if (tier === 'plus') return [
    t('subscription.feat_plus_1'),
    t('subscription.feat_plus_2'),
    t('subscription.feat_plus_3'),
  ];
  return [
    t('subscription.feat_essential_1'),
    t('subscription.feat_essential_2'),
    t('subscription.feat_essential_3'),
  ];
}

const SubscriptionModal: React.FC<Props> = ({ plan, userId, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [cgvChecked, setCgvChecked]       = useState(false);
  const [clientSecret, setClientSecret]   = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [initLoading, setInitLoading]     = useState(plan.tier !== 'essential');
  const [step, setStep]                   = useState<'form' | 'verifying' | 'success'>('form');
  const [error, setError]                 = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (plan.tier === 'essential') return;
    // Guard against React StrictMode double-invocation in dev
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    supabase.functions.invoke('create-subscription-payment-intent', {
      body: { tier: plan.tier },
    }).then(({ data, error: fnError }) => {
      if (fnError || !data?.clientSecret) {
        setError(t('subscription.error_generic'));
        fetchedRef.current = false; // allow retry if user reopens modal
      } else {
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        setError(null);
      }
      setInitLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activateSubscription = async (piId?: string | null) => {
    setStep('verifying');
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('update-subscription', {
        body: { tier: plan.tier, paymentIntentId: piId ?? null },
      });
      if (fnError || !data?.success) throw new Error(fnError?.message ?? 'Failed');
      setStep('success');
      setTimeout(() => navigate(`/profile/${userId}?tab=comptabilite`), 2000);
    } catch (e) {
      setError(t('subscription.error_generic'));
      setStep('form');
    }
  };

  const handleEssentialConfirm = () => activateSubscription(null);

  // Called by StripePaymentForm after stripe.confirmPayment succeeds
  const handlePaymentSuccess = () => activateSubscription(paymentIntentId);

  const features = getPlanFeatures(plan.tier, t);

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={step === 'form' ? onClose : undefined}
      />

      {/* Card */}
      <div className="relative w-full sm:max-w-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="p-6">

          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">
                {t('subscription.recap_title')}
              </p>
              <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-main)]">
                {plan.name}
              </h2>
              {plan.price != null ? (
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                  <span className="text-xl font-black text-[var(--color-text-main)]">{plan.price}€</span>
                  {' '}{t('subscription.per_month')}
                </p>
              ) : (
                <p className="text-sm font-black text-[var(--color-accent)] mt-0.5">
                  {t('subscription.free')}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] border-none cursor-pointer transition-colors shrink-0 ml-4"
            >
              <X size={16} />
            </button>
          </div>

          {/* Features recap */}
          <div className="mb-5 p-4 bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border)] space-y-2.5">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm text-[var(--color-text-main)]">
                <Check size={14} className="text-[#10b981] shrink-0" />
                {f}
              </div>
            ))}
          </div>

          {/* CGV */}
          <label className="flex items-start gap-3 cursor-pointer mb-5 select-none">
            <input
              type="checkbox"
              checked={cgvChecked}
              onChange={e => setCgvChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer accent-[var(--color-accent)]"
            />
            <span className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              {t('subscription.cgv_label')}{' '}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
                onClick={e => e.stopPropagation()}
              >
                {t('subscription.cgv_link')}
              </a>
            </span>
          </label>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Payment zone */}
          {step === 'success' ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-black text-lg text-[var(--color-text-main)]">{t('subscription.success_title')}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{t('subscription.success_sub')}</p>
            </div>
          ) : step === 'verifying' ? (
            <div className="text-center py-6">
              <Loader2 className="animate-spin mx-auto text-[var(--color-accent)]" size={28} />
              <p className="text-xs text-[var(--color-text-muted)] mt-3">{t('subscription.btn_processing')}</p>
            </div>
          ) : plan.tier === 'essential' ? (
            <button
              onClick={handleEssentialConfirm}
              disabled={!cgvChecked}
              className="w-full py-3.5 bg-[var(--color-accent)] text-white rounded-2xl font-black text-sm uppercase tracking-widest border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {t('subscription.btn_essential')}
            </button>
          ) : initLoading ? (
            <div className="text-center py-6">
              <Loader2 className="animate-spin mx-auto text-[var(--color-accent)]" size={28} />
            </div>
          ) : clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: { theme: 'stripe' } }}
            >
              <StripePaymentForm
                totalPrice={plan.price!}
                onConfirm={handlePaymentSuccess}
                label={t('subscription.pay_label', { price: plan.price })}
                disabled={!cgvChecked}
              />
            </Elements>
          ) : (
            <div className="text-center py-4 text-sm text-red-400">
              {t('subscription.error_generic')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
