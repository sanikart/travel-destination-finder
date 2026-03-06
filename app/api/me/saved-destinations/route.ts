import { NextResponse } from 'next/server';

import { getDestinations } from '@/lib/data';
import { readSavedDestinations } from '@/lib/server/storage';
import { getUserId } from '@/lib/server/user';

export async function GET(): Promise<NextResponse> {
  const userId = await getUserId();
  const [saved, destinations] = await Promise.all([readSavedDestinations(), getDestinations()]);

  const destinationMap = new Map(destinations.map((destination) => [destination.id, destination]));

  const userSaved = saved
    .filter((item) => item.userId === userId)
    .map((item) => ({
      ...item,
      destination: destinationMap.get(item.destinationId) ?? null
    }));

  return NextResponse.json({ count: userSaved.length, savedDestinations: userSaved });
}
