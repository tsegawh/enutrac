//import React, { useState, useEffect } from 'react'; // <- make sure useState is imported
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import React from 'react';
import toast from 'react-hot-toast';

interface Props {
  clientSecret: string;
  orderId: string;
  defaultEmail?: string;
  onSuccess: () => void;
}

export default function StripeEmbeddedForm({ orderId, onSuccess }: Props) {
  const stripe = useStripe();
  const elements = useElements();
 //const [email, setEmail] = useState(defaultEmail); // prefill
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
   // receipt_email: userEmail, // <-- add this
 // billing_details: { email }, // pass email to Stripe
 
 
        return_url: `${window.location.origin}/payment/success?orderId=${orderId}`,
      },
    });

    if (error) {
    
       toast.error(error.message ?? "An unexpected error occurred");
    } else {
      toast.success('Payment successful!');
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" className="btn-primary w-full mt-4" disabled={!stripe}>
        Pay Now
      </button>
    </form>
  );
}
