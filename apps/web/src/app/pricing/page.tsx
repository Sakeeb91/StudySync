'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, GraduationCap, Building2 } from 'lucide-react';
import { createCheckoutSession } from '@/lib/subscription-api';

const plans = [
  {
    id: 'free',
    name: 'Free',
    tier: 'FREE',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Perfect for trying out StudySync',
    features: [
      '1 course',
      '3 flashcard sets',
      '5 quizzes',
      'Basic AI flashcard generation',
      'Basic AI quiz generation',
    ],
    cta: 'Get Started',
    highlighted: false,
    icon: null,
  },
  {
    id: 'premium',
    name: 'Premium',
    tier: 'PREMIUM',
    monthlyPrice: 999, // in cents
    yearlyPrice: 9999,
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY,
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY,
    description: 'Unlimited courses and advanced features',
    features: [
      'Unlimited courses',
      'Unlimited flashcard sets',
      'Unlimited quizzes',
      'Knowledge graph visualization',
      'Analytics dashboard',
      'Priority support',
      'Data export',
      'Advanced AI features',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
    icon: Sparkles,
  },
  {
    id: 'student_plus',
    name: 'Student Plus',
    tier: 'STUDENT_PLUS',
    monthlyPrice: 1499,
    yearlyPrice: 14999,
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STUDENT_PLUS_MONTHLY,
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STUDENT_PLUS_YEARLY,
    description: 'All Premium features plus AI tutoring',
    features: [
      'Everything in Premium',
      'Exam prediction engine',
      'Assignment brainstorming',
      'AI tutoring sessions',
      'Advanced analytics',
      '7-day free trial',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
    icon: GraduationCap,
  },
];

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function calculateSavings(monthly: number, yearly: number): number {
  const annualFromMonthly = monthly * 12;
  return Math.round(((annualFromMonthly - yearly) / annualFromMonthly) * 100);
}

export default function PricingPage() {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSelectPlan = async (plan: typeof plans[0]) => {
    if (plan.id === 'free') {
      router.push('/register');
      return;
    }

    // Check if user is logged in
    const token = localStorage.getItem('accessToken');
    if (!token) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/pricing&plan=${plan.id}`);
      return;
    }

    setIsLoading(plan.id);

    try {
      const priceId = isYearly ? plan.yearlyPriceId : plan.monthlyPriceId;

      if (!priceId) {
        console.error('Price ID not configured for', plan.name);
        alert('This plan is not available yet. Please try again later.');
        return;
      }

      const { url } = await createCheckoutSession({
        priceId,
        billingPeriod: isYearly ? 'yearly' : 'monthly',
      });

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Unable to start checkout. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include AI-powered study tools.
          </p>

          {/* Student Discount Badge */}
          <div className="mt-6 inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              20% student discount with .edu email
            </span>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
            Monthly
          </span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
            Yearly
          </span>
          {isYearly && (
            <Badge variant="secondary" className="ml-2">
              Save up to 17%
            </Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const Icon = plan.icon;

            return (
              <Card
                key={plan.id}
                className={`relative p-8 ${
                  plan.highlighted
                    ? 'border-primary border-2 shadow-xl scale-105 z-10'
                    : 'border-border'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    {Icon && <Icon className="h-5 w-5 text-primary" />}
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      {price === 0 ? 'Free' : formatPrice(price)}
                    </span>
                    {price > 0 && (
                      <span className="text-muted-foreground">
                        /{isYearly ? 'year' : 'month'}
                      </span>
                    )}
                  </div>
                  {price > 0 && !isYearly && (
                    <p className="text-sm text-muted-foreground mt-2">
                      or {formatPrice(plan.yearlyPrice)}/year (save {calculateSavings(plan.monthlyPrice, plan.yearlyPrice)}%)
                    </p>
                  )}
                  {price > 0 && isYearly && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {formatPrice(plan.yearlyPrice / 12)}/month billed annually
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isLoading === plan.id}
                  className={`w-full mb-6 ${plan.highlighted ? '' : 'variant-outline'}`}
                  variant={plan.highlighted ? 'default' : 'outline'}
                >
                  {isLoading === plan.id ? 'Loading...' : plan.cta}
                </Button>

                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Enterprise Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <Card className="p-8 bg-muted/30">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-2">University & Enterprise</h3>
                <p className="text-muted-foreground">
                  Looking for bulk licenses, custom integrations, or a dedicated account manager?
                  We offer special pricing for universities and large organizations.
                </p>
              </div>
              <Button variant="outline" size="lg" onClick={() => router.push('/contact')}>
                Contact Sales
              </Button>
            </div>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            All plans include a 30-day money-back guarantee.
            <br />
            Questions?{' '}
            <a href="/contact" className="text-primary hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
