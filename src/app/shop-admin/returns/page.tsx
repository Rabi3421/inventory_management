'use client';

import React from 'react';
import ShopAdminLayout from '@/components/ShopAdminLayout';
import ReturnsWorkspace from '@/components/returns/ReturnsWorkspace';

export default function ShopAdminReturnsPage() {
  return (
    <ReturnsWorkspace
      layout={ShopAdminLayout}
      activeRoute="/shop-admin/returns"
      title="Shop Returns"
      subtitle="Search old bills, take products back into stock, and record customer refunds for your shop."
    />
  );
}
