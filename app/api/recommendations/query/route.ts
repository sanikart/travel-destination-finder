import { NextResponse } from 'next/server';

import { getDestinations } from '@/lib/data';
import { recommendationSchema } from '@/lib/schemas';
import { buildRecommendations } from '@/lib/scoring';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const input = recommendationSchema.parse(body);

    const destinations = await getDestinations();
    const recommendations = buildRecommendations(destinations, input);

    return NextResponse.json({
      input,
      count: recommendations.length,
      recommendations
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Invalid recommendation input',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    );
  }
}
