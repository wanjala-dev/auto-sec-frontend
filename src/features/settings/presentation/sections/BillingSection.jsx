import React from 'react';

import HudCard from '../../../../components/V2/HudCard';
import HudText from '../../../../components/V2/HudText';
import HudPaymentCard from '../../../../components/V2/HudPaymentCard';

/**
 * BillingSection — Settings ▸ Workspace ▸ Billing: the workspace's card on
 * file. Demo card data for now — billing endpoints aren't wired yet; this is
 * the surface the payment provider will populate (card on file, invoices,
 * plan management).
 */
export default function BillingSection() {
  return (
    <div className="space-y-5">
      <div>
        <HudText variant="heading" color="cyan-muted" as="p" className="mb-3">
          CARD ON FILE
        </HudText>
        <div style={{ width: 260, height: 165 }}>
          <HudPaymentCard
            card={{
              brand: 'visa',
              last4: '4242',
              exp_month: 12,
              exp_year: 2027,
              is_default: true
            }}
            size="sm"
          />
        </div>
      </div>
      <HudCard bodyClassName="p-4">
        <HudText variant="caption" color="muted" as="p">
          Billing is not connected to live data yet — this card is a
          placeholder for the card on file. Invoices and plan management will
          surface here once the billing provider is wired.
        </HudText>
      </HudCard>
    </div>
  );
}
