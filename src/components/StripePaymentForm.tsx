import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';

export const StripePaymentForm = ({ onConfirm, totalPrice, label, disabled }: {
  onConfirm: () => void;
  totalPrice: number;
  label?: string;
  disabled?: boolean;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required', 
    });

    if (error) {
      alert(error.message);
      setIsProcessing(false);
    } else {
      onConfirm(); // Succès ! On crée le booking en base
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <PaymentElement />
      <button
        disabled={isProcessing || !!disabled}
        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {isProcessing ? "Validation..." : (label ?? `Payer ${totalPrice}€`)}
      </button>
    </form>
  );
};