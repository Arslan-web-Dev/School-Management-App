// API: Users Management
// Routes: GET /users, POST /users, DELETE /users/:id
// Roles: admin only

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifyAuth, requireRole, createErrorResponse, createSuccessResponse } from '../_shared/auth.ts';

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const { user, error: authError } = await verifyAuth(req);
  if (authError || !user) {
    return createErrorResponse(authError || 'Unauthorized', 401);
  }

  if (!requireRole(user, ['admin'])) {
    return createErrorResponse('Admin access required', 403);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  const url = new URL(req.url);
  const method = req.method;

  try {
    // GET /users - List all users with roles
    if (method === 'GET') {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at');

      if (error) throw error;

      // Get roles for each user
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const usersWithRoles = profiles?.map((p: any) => ({
        ...p,
        role: roles?.find((r: any) => r.user_id === p.id)?.role || 'unknown',
      }));

      return createSuccessResponse({ users: usersWithRoles });
    }

    // POST /users - Create new user
    if (method === 'POST') {
      const { email, password, fullName, role, phone } = await req.json();

      // Create auth user
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role },
      });

      if (authErr) throw authErr;

      // Update profile
      if (phone) {
        await supabase.from('profiles').update({ phone }).eq('id', authData.user.id);
      }

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: authData.user.id, role });

      if (roleError) throw roleError;

      return createSuccessResponse({
        user: {
          id: authData.user.id,
          email,
          fullName,
          role,
        },
        message: 'User created successfully',
      }, 201);
    }

    // DELETE /users/:id
    if (method === 'DELETE') {
      const userId = url.pathname.split('/').pop();
      if (!userId) {
        return createErrorResponse('User ID required', 400);
      }

      // Remove role first
      await supabase.from('user_roles').delete().eq('user_id', userId);

      // Delete auth user (requires service role)
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      return createSuccessResponse({ message: 'User deleted' });
    }

    return createErrorResponse('Method not allowed', 405);
  } catch (error: any) {
    return createErrorResponse(error.message || 'Server error', 500);
  }
});
