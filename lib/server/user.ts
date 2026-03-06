import { headers } from 'next/headers';

export async function getUserId(): Promise<string> {
  const incomingHeaders = await headers();
  return incomingHeaders.get('x-user-id') || 'demo-user';
}
