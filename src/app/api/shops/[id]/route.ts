import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ShopModel } from '@/lib/models/Shop';

/**
 * GET /api/shops/[id]   — fetch a single shop
 * PUT /api/shops/[id]   — update name/location/manager/phone/status
 * DELETE /api/shops/[id] — delete a shop
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const shop = await ShopModel.findById(id).lean();
    if (!shop) return NextResponse.json({ error: 'Shop not found.' }, { status: 404 });
    return NextResponse.json({ shop: { ...shop, _id: shop._id.toString() } });
  } catch (err) {
    console.error('[GET /api/shops/[id]]', err);
    return NextResponse.json({ error: 'Failed to fetch shop.' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const { name, location, manager, phone, status } = body;

    if (!name?.trim())     return NextResponse.json({ error: 'Shop name is required.' },   { status: 400 });
    if (!location?.trim()) return NextResponse.json({ error: 'Location is required.' },    { status: 400 });
    if (!manager?.trim())  return NextResponse.json({ error: 'Manager name is required.' }, { status: 400 });

    // Ensure no other shop has the same name
    const duplicate = await ShopModel.findOne({
      _id:  { $ne: id },
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
    });
    if (duplicate) return NextResponse.json({ error: 'Another shop with this name already exists.' }, { status: 409 });

    const updated = await ShopModel.findByIdAndUpdate(
      id,
      { name: name.trim(), location: location.trim(), manager: manager.trim(), phone: phone?.trim() ?? '', status },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) return NextResponse.json({ error: 'Shop not found.' }, { status: 404 });
    return NextResponse.json({ shop: { ...updated, _id: updated._id.toString() } });
  } catch (err) {
    console.error('[PUT /api/shops/[id]]', err);
    return NextResponse.json({ error: 'Failed to update shop.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const deleted = await ShopModel.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'Shop not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/shops/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete shop.' }, { status: 500 });
  }
}
