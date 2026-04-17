'use client';

import React from 'react';
import ShopAdminLayout from '@/components/ShopAdminLayout';
import BillingWorkspace from '@/components/billing/BillingWorkspace';

export default function ShopAdminBillingPage() {
  return (
    <BillingWorkspace
      layout={ShopAdminLayout}
      activeRoute="/shop-admin/billing"
      title="Billing"
      subtitle="Use your scan gun or search products to add to cart"
    />
  );
}
