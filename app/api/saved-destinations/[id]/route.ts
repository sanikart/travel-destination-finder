import { NextResponse } from 'next/server';

import { readSavedDestinations, writeSavedDestinations } from '@/lib/server/storage';
import { getUserId } from '@/lib/server/user';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const userId = await getUserId();

  const saved = await readSavedDestinations();
  const remaining = saved.filter((item) => !(item.id === id && item.userId === userId));

  if (remaining.length === saved.length) {
    return NextResponse.json({ error: 'Saved destination not found' }, { status: 404 });
  }

  await writeSavedDestinations(remaining);
  return NextResponse.json({ ok: true });
}
