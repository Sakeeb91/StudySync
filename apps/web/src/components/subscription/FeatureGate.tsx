'use client';

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

interface FeatureGateProps {
  children: ReactNode;
  feature: string;
  tier: string;
  requiredTier: string;
  fallback?: ReactNode;
}

export function FeatureGate({
  children,
  feature,
  tier,
  requiredTier,
  fallback,
}: FeatureGateProps) {
  const hasAccess = tier === requiredTier || tier === 'PREMIUM' || tier === 'STUDENT_PLUS';

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="p-8 text-center">
      <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-2xl font-bold mb-2">{feature} is a Premium Feature</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Upgrade to {requiredTier} to unlock this feature and many more advanced study tools.
      </p>
      <Button size="lg" onClick={() => (window.location.href = '/pricing')}>
        Upgrade to {requiredTier}
      </Button>
    </Card>
  );
}
