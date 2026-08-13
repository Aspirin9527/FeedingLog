import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const accountPattern = /^[a-z0-9_]{3,32}$/;
const authEmailDomain = 'feedinglog.local';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405);
  }

  try {
    const supabaseUrl = requireEnv('SUPABASE_URL');
    const publishableKeys = requireJsonEnv('SUPABASE_PUBLISHABLE_KEYS');
    const secretKeys = requireJsonEnv('SUPABASE_SECRET_KEYS');
    const anonKey = getFirstSecretValue(publishableKeys, 'SUPABASE_PUBLISHABLE_KEYS');
    const serviceRoleKey = getFirstSecretValue(secretKeys, 'SUPABASE_SECRET_KEYS');
    const authorization = request.headers.get('Authorization');

    if (!authorization) {
      return jsonResponse({ error: 'missing authorization' }, 401);
    }

    const { account, password } = await request.json();
    validateInput(account, password);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'invalid session' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: adminRow, error: adminError } = await adminClient
      .from('app_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminError) {
      throw adminError;
    }

    if (!adminRow) {
      return jsonResponse({ error: 'admin permission required' }, 403);
    }

    const targetUser = await findUserByEmail(adminClient, accountToAuthEmail(account));
    if (!targetUser) {
      return jsonResponse({ error: 'user not found' }, 404);
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUser.id, {
      password,
    });

    if (updateError) {
      throw updateError;
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'password reset failed';
    return jsonResponse({ error: message }, 400);
  }
});

function requireEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`${key} is not configured`);
  }

  return value;
}

function requireJsonEnv(key: string): unknown {
  const value = requireEnv(key);
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getFirstSecretValue(value: unknown, key: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (Array.isArray(value)) {
    const firstString = value.find((item): item is string => typeof item === 'string' && item.trim().length > 0);
    if (firstString) {
      return firstString;
    }
  }

  if (value && typeof value === 'object') {
    const firstString = Object.values(value).find(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
    if (firstString) {
      return firstString;
    }
  }

  throw new Error(`${key} is not configured`);
}

function validateInput(account: unknown, password: unknown): asserts account is string {
  if (typeof account !== 'string' || !accountPattern.test(account.trim().toLowerCase())) {
    throw new Error('invalid account');
  }

  if (typeof password !== 'string' || password.length < 6) {
    throw new Error('invalid password');
  }
}

function accountToAuthEmail(account: string): string {
  return `${account.trim().toLowerCase()}@${authEmailDomain}`;
}

async function findUserByEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string,
): Promise<{ id: string } | null> {
  const perPage = 1000;
  for (let page = 1; page <= 10; page += 1) {
    const {
      data: { users },
      error,
    } = await adminClient.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const matchedUser = users.find((user) => user.email?.toLowerCase() === email);
    if (matchedUser) {
      return { id: matchedUser.id };
    }

    if (users.length < perPage) {
      return null;
    }
  }

  return null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
