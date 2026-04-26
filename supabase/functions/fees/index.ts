// API: Fee Management
// Routes: GET /fees, POST /fees, PUT /fees/:id, DELETE /fees/:id
// Roles: admin (full), parent/student (view own)

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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  const url = new URL(req.url);
  const method = req.method;

  try {
    // GET /fees - List fee records
    if (method === 'GET') {
      let query = supabase
        .from('fees')
        .select('*, students(name, roll_number, classes(name, section))');

      // Student: own fees only
      if (user.role === 'student') {
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (student) query = query.eq('student_id', student.id);
      }
      // Parent: children's fees only
      else if (user.role === 'parent') {
        const { data: links } = await supabase
          .from('parent_children')
          .select('student_id')
          .eq('parent_id', user.id);
        const studentIds = links?.map((l: any) => l.student_id) || [];
        if (studentIds.length > 0) query = query.in('student_id', studentIds);
      }

      const studentId = url.searchParams.get('studentId');
      const status = url.searchParams.get('status');

      if (studentId && requireRole(user, ['admin'])) query = query.eq('student_id', studentId);
      if (status) query = query.eq('status', status);

      const { data, error } = await query.order('due_date', { ascending: false });

      if (error) throw error;
      return createSuccessResponse({ fees: data || [] });
    }

    // POST /fees - Create fee record
    if (method === 'POST') {
      if (!requireRole(user, ['admin'])) {
        return createErrorResponse('Admin access required', 403);
      }

      const { student_id, fee_type, amount, due_date, month, year, description } = await req.json();

      const { data, error } = await supabase.from('fees').insert({
        student_id,
        fee_type,
        amount,
        due_date,
        month,
        year,
        description,
        status: 'pending',
      }).select().single();

      if (error) throw error;
      return createSuccessResponse({ fee: data, message: 'Fee record created' }, 201);
    }

    // PUT /fees/:id - Update (mark paid, etc)
    if (method === 'PUT') {
      if (!requireRole(user, ['admin'])) {
        return createErrorResponse('Admin access required', 403);
      }

      const feeId = url.pathname.split('/').pop();
      const updates = await req.json();

      const { data, error } = await supabase
        .from('fees')
        .update({
          ...updates,
          paid_date: updates.status === 'paid' ? new Date().toISOString() : undefined,
        })
        .eq('id', feeId)
        .select()
        .single();

      if (error) throw error;
      return createSuccessResponse({ fee: data, message: 'Fee updated' });
    }

    // DELETE /fees/:id
    if (method === 'DELETE') {
      if (!requireRole(user, ['admin'])) {
        return createErrorResponse('Admin access required', 403);
      }

      const feeId = url.pathname.split('/').pop();
      const { error } = await supabase.from('fees').delete().eq('id', feeId);

      if (error) throw error;
      return createSuccessResponse({ message: 'Fee record deleted' });
    }

    return createErrorResponse('Method not allowed', 405);
  } catch (error: any) {
    return createErrorResponse(error.message || 'Server error', 500);
  }
});
