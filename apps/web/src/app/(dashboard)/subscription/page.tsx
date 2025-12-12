'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false);

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscriptions/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to create portal session:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Subscription & Billing</h1>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Current Plan</h2>
            <p className="text-muted-foreground">Manage your subscription and billing</p>
          </div>
          <Badge variant="default" className="text-lg px-4 py-2">
            Premium
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium">Active</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Billing Cycle</span>
            <span className="font-medium">Monthly</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Next Billing Date</span>
            <span className="font-medium">January 15, 2026</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium text-xl">$9.99</span>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <Button onClick={handleManageBilling} disabled={loading}>
            {loading ? 'Loading...' : 'Manage Billing'}
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/pricing'}>
            Change Plan
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Usage</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span>Flashcard Sets</span>
              <span className="text-muted-foreground">5 / Unlimited</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span>Quizzes</span>
              <span className="text-muted-foreground">12 / Unlimited</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span>Courses</span>
              <span className="text-muted-foreground">3 / Unlimited</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
