import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { SettingsModel } from '@/lib/models/Settings';
import { InventoryLogModel } from '@/lib/models/InventoryLog';
import { UserModel } from '@/lib/models/User';

/**
 * GET /api/settings
 * Returns the single settings document (upserts defaults on first call).
 */
export async function GET() {
  try {
    await connectToDatabase();
    // There is always exactly one settings doc — upsert with defaults on first call
    let settings = await SettingsModel.findOne({}).lean();
    if (!settings) {
      const doc = await SettingsModel.create({});
      settings = doc.toObject();
    }
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('[GET /api/settings]', err);
    return NextResponse.json({ error: 'Failed to load settings.' }, { status: 500 });
  }
}

/**
 * PUT /api/settings
 * Updates the single settings document.
 * Body: Partial<AppSettings>
 */
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    // Whitelist allowed fields
    const allowed = [
      'orgName', 'currency', 'timezone', 'dateFormat', 'language',
      'lowStockThreshold', 'autoRestockSuggestion',
      'notifLowStockEmail', 'notifOutOfStockEmail', 'notifWeeklyReport',
      'notifNewUserAlert', 'notifShopSyncError', 'notifRestockApproved',
      'secTwoFactor', 'secSessionTimeout', 'secIpWhitelist', 'secAuditLog',
    ];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    const settings = await SettingsModel.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, new: true },
    ).lean();

    return NextResponse.json({ settings, success: true });
  } catch (err) {
    console.error('[PUT /api/settings]', err);
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
  }
}

/**
 * POST /api/settings?action=export-audit
 * Exports the last 500 inventory log entries as CSV for audit log download.
 */
export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');

  if (action === 'export-audit') {
    try {
      await connectToDatabase();
      const logs = await InventoryLogModel.find({})
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

      const rows = [
        ['Date', 'Product', 'SKU', 'Type', 'Qty', 'Balance After', 'Note', 'Performed By'],
        ...logs.map(l => [
          new Date(l.createdAt).toISOString().replace('T', ' ').slice(0, 19),
          `"${l.productName}"`, l.productSku, l.type, l.qty, l.balanceAfter, `"${l.note}"`, `"${l.performedBy}"`,
        ]),
      ];
      const csv = rows.map(r => r.join(',')).join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0,10)}.csv"`,
        },
      });
    } catch (err) {
      console.error('[POST /api/settings export-audit]', err);
      return NextResponse.json({ error: 'Failed to export audit log.' }, { status: 500 });
    }
  }

  if (action === 'reset-sessions') {
    try {
      await connectToDatabase();
      // Delete all sessions from the Session model
      const { SessionModel } = await import('@/lib/models/Session');
      await SessionModel.deleteMany({});
      return NextResponse.json({ success: true, message: 'All sessions cleared.' });
    } catch (err) {
      console.error('[POST /api/settings reset-sessions]', err);
      return NextResponse.json({ error: 'Failed to reset sessions.' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
