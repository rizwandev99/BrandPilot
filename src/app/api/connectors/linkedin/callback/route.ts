import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { connectors } from '@/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { resolveWorkspace } from '@/server/workspace/workspace-service';
import { encryptToken } from '@/lib/security/aes-gcm';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/connectors?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`,
        req.url
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/connectors?error=missing_authorization_code', req.url)
    );
  }

  try {
    const cookieHeader = req.headers.get('cookie') || undefined;
    const { workspaceId } = await resolveWorkspace(cookieHeader);

    const clientId = process.env.LINKEDIN_CLIENT_ID || '';
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';
    const redirectUri =
      process.env.LINKEDIN_REDIRECT_URI ||
      'http://localhost:3000/api/connectors/linkedin/callback';

    if (clientId && clientSecret) {
      const tokenRes = await fetch(
        'https://www.linkedin.com/oauth/v2/accessToken',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        }
      );

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        const expiresIn = tokenData.expires_in;
        const tokenExpiresAt = expiresIn
          ? new Date(Date.now() + expiresIn * 1000)
          : null;
        const tokenEncrypted = encryptToken(accessToken);

        await db
          .update(connectors)
          .set({
            mode: 'live',
            status: 'connected',
            tokenEncrypted,
            tokenExpiresAt,
          })
          .where(
            and(
              eq(connectors.workspaceId, workspaceId),
              eq(connectors.provider, 'linkedin')
            )
          );
      }
    }

    return NextResponse.redirect(new URL('/connectors?connected=linkedin', req.url));
  // intentional any: catch clause error from OAuth redirect flow
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(
        `/connectors?error=${encodeURIComponent(err.message || 'oauth_exchange_failed')}`,
        req.url
      )
    );
  }
}
