import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { getDestinationById } from '@/lib/data';
import { saveDestinationSchema } from '@/lib/schemas';
import { readSavedDestinations, writeSavedDestinations } from '@/lib/server/storage';
import { getUserId } from '@/lib/server/user';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const input = saveDestinationSchema.parse(body);
    const userId = await getUserId();

    const destination = await getDestinationById(input.destinationId);
    if (!destination) {
      return NextResponse.json({ error: 'Destination not found' }, { status: 404 });
    }

    const saved = await readSavedDestinations();
    const existing = saved.find(
      (item) => item.userId === userId && item.destinationId === input.destinationId
    );

    if (existing) {
      return NextResponse.json({ savedDestination: existing });
    }

    const record = {
      id: randomUUID(),
      userId,
      destinationId: input.destinationId,
      note: input.note,
      createdAt: new Date().toISOString()
    };

    saved.push(record);
    await writeSavedDestinations(saved);

    return NextResponse.json({ savedDestination: record }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Invalid save request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    );
  }
}
