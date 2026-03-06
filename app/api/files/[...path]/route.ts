import { promises as fs } from 'node:fs';
import path from 'node:path';

import { NextResponse } from 'next/server';

function contentTypeFor(filePath: string): string {
  if (filePath.endsWith('.pmtiles')) return 'application/octet-stream';
  if (filePath.endsWith('.json')) return 'application/json';
  if (filePath.endsWith('.geojson')) return 'application/geo+json';
  return 'application/octet-stream';
}

function parseRange(rangeHeader: string, fileSize: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;

  const startRaw = match[1];
  const endRaw = match[2];

  let start = startRaw ? Number(startRaw) : 0;
  let end = endRaw ? Number(endRaw) : fileSize - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start < 0) start = 0;
  if (end >= fileSize) end = fileSize - 1;
  if (start > end || start >= fileSize) return null;

  return { start, end };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path: parts } = await context.params;
  const relativePath = parts.join('/');

  if (relativePath.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const absolutePath = path.join(process.cwd(), relativePath);
  if (!absolutePath.startsWith(process.cwd())) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  try {
    const stats = await fs.stat(absolutePath);
    const type = contentTypeFor(absolutePath);
    const rangeHeader = request.headers.get('range');

    if (rangeHeader) {
      const parsed = parseRange(rangeHeader, stats.size);
      if (!parsed) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'content-range': `bytes */${stats.size}`,
            'accept-ranges': 'bytes'
          }
        });
      }

      const { start, end } = parsed;
      const chunkSize = end - start + 1;
      const handle = await fs.open(absolutePath, 'r');
      const buffer = Buffer.alloc(chunkSize);
      await handle.read(buffer, 0, chunkSize, start);
      await handle.close();

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          'content-type': type,
          'accept-ranges': 'bytes',
          'content-range': `bytes ${start}-${end}/${stats.size}`,
          'content-length': String(chunkSize),
          'cache-control': 'no-store'
        }
      });
    }

    const fileBuffer = await fs.readFile(absolutePath);
    return new NextResponse(fileBuffer, {
      headers: {
        'content-type': type,
        'content-length': String(stats.size),
        'accept-ranges': 'bytes',
        'cache-control': 'no-store'
      }
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
