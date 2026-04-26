// Auth utilities for Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface User {
  id: string;
  email: string;
  role: string;
}

export async function verifyAuth(req: Request): Promise<{ user: User | null; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' };
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: 'Invalid token' };
  }

  // Get user role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return {
    user: {
      id: user.id,
      email: user.email || '',
      role: roleData?.role || 'unknown',
    },
    error: null,
  };
}

export function requireRole(user: User, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role);
}

export function createErrorResponse(message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

export function createSuccessResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify({ success: true, ...data }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}
