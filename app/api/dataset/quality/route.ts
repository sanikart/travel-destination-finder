import { NextResponse } from 'next/server';

import { getDatasetQualitySummary } from '@/lib/data';

export async function GET(): Promise<NextResponse> {
  const summary = await getDatasetQualitySummary();
  return NextResponse.json({ summary });
}
