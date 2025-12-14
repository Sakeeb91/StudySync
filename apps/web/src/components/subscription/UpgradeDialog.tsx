'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { createCheckoutSession } from '@/lib/subscription-api';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  currentTier?: string;
}

const upgradeBenefits = [
  'Unlimited flashcard sets and quizzes',
  'Knowledge graph visualization',
  'Advanced analytics dashboard',
  'Priority support',
  'Export your data anytime',
];

export function UpgradeDialog({
  open,
  onOpenChange,
  feature,
  currentTier = 'FREE',
}: UpgradeDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);

    try {
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY;

      if (!priceId) {
        // Fallback to pricing page if price ID not configured
        router.push('/pricing');
        return;
      }

      const { url } = await createCheckoutSession({
        priceId,
        billingPeriod: 'monthly',
      });

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      // Fallback to pricing page
      router.push('/pricing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPlans = () => {
    onOpenChange(false);
    router.push('/pricing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            {feature ? `Unlock ${feature}` : 'Upgrade to Premium'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {feature
              ? `${feature} is a Premium feature. Upgrade now to unlock it and get access to all premium features.`
              : 'Get unlimited access to all StudySync features with Premium.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current plan indicator */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">Current plan:</span>
            <Badge variant="secondary">{currentTier}</Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge className="bg-primary">Premium</Badge>
          </div>

          {/* Benefits list */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            {upgradeBenefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          {/* Price */}
          <div className="text-center">
            <div className="text-3xl font-bold">$9.99</div>
            <div className="text-sm text-muted-foreground">per month</div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleUpgrade} disabled={isLoading} className="w-full">
            <Zap className="mr-2 h-4 w-4" />
            {isLoading ? 'Loading...' : 'Upgrade Now'}
          </Button>
          <Button variant="ghost" onClick={handleViewPlans} className="w-full">
            View All Plans
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          30-day money-back guarantee. Cancel anytime.
        </p>
      </DialogContent>
    </Dialog>
  );
}
