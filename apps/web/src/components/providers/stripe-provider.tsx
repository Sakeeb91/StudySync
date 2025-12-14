"use client";

import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { ReactNode } from "react";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Initialize Stripe outside of component to avoid recreating on re-renders
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

interface StripeProviderProps {
  children: ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
  if (!stripePromise) {
    // If Stripe is not configured, just render children without wrapper
    return <>{children}</>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#6366f1",
            colorBackground: "#ffffff",
            colorText: "#1f2937",
            colorDanger: "#ef4444",
            fontFamily: "system-ui, sans-serif",
            borderRadius: "8px",
          },
        },
      }}
    >
      {children}
    </Elements>
  );
}

export { stripePromise };
