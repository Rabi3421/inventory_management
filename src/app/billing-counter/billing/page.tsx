'use client';

import React from 'react';
import BillingCounterLayout from '@/components/BillingCounterLayout';
import BillingWorkspace from '@/components/billing/BillingWorkspace';

export default function BillingCounterBillingPage() {
  return (
    <BillingWorkspace
      layout={BillingCounterLayout}
      activeRoute="/billing-counter/billing"
      title="Counter Billing"
      subtitle="Scan items fast and generate customer bills for your assigned shop"
    />
  );
}
