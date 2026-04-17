import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/lib/models/User';
import { hashPassword } from '@/lib/auth/password';

/**
 * PUT /api/users/[id]   — update name, email, role, shop, isActive
 * PATCH /api/users/[id] — reset password  { password }
 * DELETE /api/users/[id] — delete user
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const { name, email, role, shopId, shopName, isActive } = body;

    if (!name?.trim())  return NextResponse.json({ error: 'Name is required.' },  { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    if (!['superadmin', 'shopadmin', 'billingcounter'].includes(role))
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });

    // Duplicate email check (exclude self)
    const duplicate = await UserModel.findOne({
      _id:   { $ne: id },
      email: email.trim().toLowerCase(),
    });
    if (duplicate) return NextResponse.json({ error: 'Another user with this email already exists.' }, { status: 409 });

    const updated = await UserModel.findByIdAndUpdate(
      id,
      {
        name:     name.trim(),
        email:    email.trim().toLowerCase(),
        role,
        shopId:   shopId   ?? null,
        shopName: shopName ?? null,
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
      { new: true, runValidators: true },
    ).select('-passwordHash').lean();

    if (!updated) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    return NextResponse.json({
      user: {
        _id:        updated._id.toString(),
        name:       updated.name,
        email:      updated.email,
        role:       updated.role,
        shopId:     updated.shopId   ?? null,
        shopName:   updated.shopName ?? null,
        isActive:   updated.isActive,
        lastLoginAt:updated.lastLoginAt ?? null,
        createdAt:  updated.createdAt,
        updatedAt:  updated.updatedAt,
      },
    });
  } catch (err) {
    console.error('[PUT /api/users/[id]]', err);
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    // Reset password
    if (body.password !== undefined) {
      const { password } = body;
      if (!password || password.length < 6)
        return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });

      const updated = await UserModel.findByIdAndUpdate(
        id,
        { passwordHash: hashPassword(password) },
        { new: true },
      ).lean();
      if (!updated) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    // Toggle active status
    if (body.isActive !== undefined) {
      const updated = await UserModel.findByIdAndUpdate(
        id,
        { isActive: Boolean(body.isActive) },
        { new: true },
      ).select('-passwordHash').lean();
      if (!updated) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      return NextResponse.json({ success: true, isActive: updated.isActive });
    }

    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  } catch (err) {
    console.error('[PATCH /api/users/[id]]', err);
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const deleted = await UserModel.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/users/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete user.' }, { status: 500 });
  }
}
