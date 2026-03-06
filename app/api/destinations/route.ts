import { NextResponse } from 'next/server';

import { getDestinations } from '@/lib/data';
import { destinationFilterSchema } from '@/lib/schemas';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const parsed = destinationFilterSchema.parse({
    countryIso: searchParams.get('countryIso') ?? undefined,
    adminLevel: searchParams.get('adminLevel') ?? undefined,
    tags: searchParams.get('tags') ?? undefined
  });

  const destinations = await getDestinations();

  const filtered = destinations.filter((destination) => {
    if (parsed.countryIso && destination.countryIso3 !== parsed.countryIso) {
      return false;
    }

    if (parsed.adminLevel !== undefined && destination.adminLevel !== parsed.adminLevel) {
      return false;
    }

    if (parsed.tags.length > 0) {
      const destinationTags = destination.tags.map((tag) => tag.toLowerCase());
      const hasMatch = parsed.tags.some((tag) => destinationTags.includes(tag.toLowerCase()));
      if (!hasMatch) {
        return false;
      }
    }

    return true;
  });

  return NextResponse.json({
    count: filtered.length,
    destinations: filtered
  });
}
