'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out StudySync',
    features: [
      '1 course',
      '3 flashcard sets',
      '5 quizzes',
      'AI flashcard generation',
      'AI quiz generation',
      'Mobile app access',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Premium',
    price: '$9.99',
    period: '/month',
    yearlyPrice: '$99.99/year',
    description: 'Unlimited courses and advanced features',
    features: [
      'Unlimited courses',
      'Unlimited flashcard sets',
      'Unlimited quizzes',
      'Knowledge graph',
      'Analytics dashboard',
      'Priority support',
      'Data export',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Student Plus',
    price: '$14.99',
    period: '/month',
    yearlyPrice: '$149.99/year',
    description: 'All Premium features plus AI tutoring',
    features: [
      'Everything in Premium',
      'Exam prediction engine',
      'Assignment brainstorming',
      'AI tutoring',
      'Advanced analytics',
      '7-day free trial',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
];

export default function PricingPage() {
  const handleSelectPlan = (planName: string) => {
    if (planName === 'Free') {
      window.location.href = '/register';
    } else {
      window.location.href = `/checkout?plan=${planName.toLowerCase()}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include AI-powered study tools.
          </p>
          <div className="mt-6 inline-flex items-center bg-primary/10 px-4 py-2 rounded-full">
            <span className="text-sm font-medium text-primary">
              🎓 20% student discount with .edu email
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative p-8 ${
                plan.highlighted
                  ? 'border-primary border-2 shadow-xl scale-105'
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
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                {plan.yearlyPrice && (
                  <p className="text-sm text-muted-foreground mt-2">
                    or {plan.yearlyPrice} (save 17%)
                  </p>
                )}
              </div>

              <Button
                onClick={() => handleSelectPlan(plan.name)}
                className={`w-full mb-6 ${plan.highlighted ? '' : 'variant-outline'}`}
              >
                {plan.cta}
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
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            All plans include a 30-day money-back guarantee.
            <br />
            Need an enterprise plan?{' '}
            <a href="/contact" className="text-primary hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
