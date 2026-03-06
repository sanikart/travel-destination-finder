import { NextResponse } from 'next/server';

import { getDestinationById } from '@/lib/data';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const destination = await getDestinationById(id);

  if (!destination) {
    return NextResponse.json({ error: 'Destination not found' }, { status: 404 });
  }

  return NextResponse.json({ destination });
}
