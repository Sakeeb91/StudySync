'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useSubscription } from '@/contexts/subscription-context';
import {
  createPortalSession,
  cancelSubscription,
  reactivateSubscription,
  getInvoices,
  type Invoice,
} from '@/lib/subscription-api';

const tierBadgeColors: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  PREMIUM: 'bg-primary/10 text-primary',
  STUDENT_PLUS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  UNIVERSITY: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

const statusBadgeColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  TRIALING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PAST_DUE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  CANCELED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export default function SubscriptionPage() {
  const router = useRouter();
  const {
    tier,
    status,
    isTrialing,
    trialDaysRemaining,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    usage,
    isLoading: contextLoading,
    refresh,
  } = useSubscription();

  const [isLoading, setIsLoading] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const { invoices: invoiceData } = await getInvoices(5);
        setInvoices(invoiceData);
      } catch (error) {
        console.error('Failed to load invoices:', error);
      }
    };

    if (tier !== 'FREE') {
      loadInvoices();
    }
  }, [tier]);

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const { url } = await createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to create portal session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      await cancelSubscription({ immediately: false });
      await refresh();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleReactivate = async () => {
    setIsLoading(true);
    try {
      await reactivateSubscription();
      await refresh();
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUsagePercentage = (used: number, limit: number | null): number => {
    if (limit === null || limit === 0) return 0;
    return Math.min(Math.round((used / limit) * 100), 100);
  };

  if (contextLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-48 bg-muted rounded"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Subscription & Billing</h1>

      {/* Current Plan Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Manage your subscription and billing</CardDescription>
            </div>
            <Badge className={tierBadgeColors[tier] || tierBadgeColors.FREE}>
              {tier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status alerts */}
          {isTrialing && trialDaysRemaining !== null && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                Your trial ends in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}.
              </span>
            </div>
          )}

          {cancelAtPeriodEnd && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  Your subscription will be canceled on {formatDate(currentPeriodEnd)}.
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={handleReactivate} disabled={isLoading}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Reactivate
              </Button>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Status
              </span>
              <Badge className={statusBadgeColors[status] || statusBadgeColors.INACTIVE}>
                {status}
              </Badge>
            </div>

            {tier !== 'FREE' && (
              <>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {cancelAtPeriodEnd ? 'Access Until' : 'Next Billing Date'}
                  </span>
                  <span className="font-medium">{formatDate(currentPeriodEnd)}</span>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {tier === 'FREE' ? (
              <Button onClick={() => router.push('/pricing')}>
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Button>
            ) : (
              <>
                <Button onClick={handleManageBilling} disabled={isLoading}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {isLoading ? 'Loading...' : 'Manage Billing'}
                </Button>
                <Button variant="outline" onClick={() => router.push('/pricing')}>
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Change Plan
                </Button>
                {!cancelAtPeriodEnd && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="text-destructive hover:text-destructive">
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your subscription will remain active until {formatDate(currentPeriodEnd)}.
                          After that, you&apos;ll be downgraded to the Free plan and lose access to premium features.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelSubscription}
                          disabled={isCanceling}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isCanceling ? 'Canceling...' : 'Cancel Subscription'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            {tier === 'FREE'
              ? 'Upgrade to Premium for unlimited access'
              : 'Your usage this billing period'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {usage && (
              <>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Flashcard Sets</span>
                    <span className="text-muted-foreground">
                      {usage.flashcardSets.used} / {usage.flashcardSets.limit ?? 'Unlimited'}
                    </span>
                  </div>
                  <Progress
                    value={getUsagePercentage(usage.flashcardSets.used, usage.flashcardSets.limit)}
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Quizzes</span>
                    <span className="text-muted-foreground">
                      {usage.quizzes.used} / {usage.quizzes.limit ?? 'Unlimited'}
                    </span>
                  </div>
                  <Progress
                    value={getUsagePercentage(usage.quizzes.used, usage.quizzes.limit)}
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Uploads</span>
                    <span className="text-muted-foreground">
                      {usage.uploads.used} / {usage.uploads.limit ?? 'Unlimited'}
                    </span>
                  </div>
                  <Progress
                    value={getUsagePercentage(usage.uploads.used, usage.uploads.limit)}
                    className="h-2"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoices Card */}
      {tier !== 'FREE' && invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>View and download your billing history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{formatPrice(invoice.amountPaid)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(invoice.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={invoice.status === 'PAID' ? 'default' : 'secondary'}
                      className={invoice.status === 'PAID' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {invoice.status}
                    </Badge>
                    {invoice.pdfUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                          Download
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
