'use client';

import React from 'react';
import BillingCounterLayout from '@/components/BillingCounterLayout';
import ReturnsWorkspace from '@/components/returns/ReturnsWorkspace';

export default function BillingCounterReturnsPage() {
  return (
    <ReturnsWorkspace
      layout={BillingCounterLayout}
      activeRoute="/billing-counter/returns"
      title="Counter Returns"
      subtitle="Handle customer product returns for your assigned shop, update stock instantly, and keep the counter return log clean."
    />
  );
}
