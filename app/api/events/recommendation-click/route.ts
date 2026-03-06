import { NextResponse } from 'next/server';

import { clickEventSchema } from '@/lib/schemas';
import { appendRecommendationClick } from '@/lib/server/storage';
import { getUserId } from '@/lib/server/user';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const input = clickEventSchema.parse(body);
    const userId = await getUserId();

    const event = {
      ...input,
      userId,
      recordedAt: new Date().toISOString()
    };

    await appendRecommendationClick(event);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Invalid click event payload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    );
  }
}
