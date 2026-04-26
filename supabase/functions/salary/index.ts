// API: Salary Management
// Routes: GET /salary, POST /salary, PUT /salary/:id
// Roles: admin (full), teacher (view own only)

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
    // GET /salary - List salary records
    if (method === 'GET') {
      let query = supabase
        .from('salary')
        .select('*, teachers(profiles(full_name))');

      // Teachers: own salary only
      if (user.role === 'teacher') {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('id', user.id)
          .single();
        if (teacher) query = query.eq('teacher_id', teacher.id);
      }

      const teacherId = url.searchParams.get('teacherId');
      const month = url.searchParams.get('month');
      const year = url.searchParams.get('year');

      if (teacherId && requireRole(user, ['admin'])) query = query.eq('teacher_id', teacherId);
      if (month) query = query.eq('month', month);
      if (year) query = query.eq('year', year);

      const { data, error } = await query.order('year', { ascending: false }).order('month', { ascending: false });

      if (error) throw error;
      return createSuccessResponse({ salaries: data || [] });
    }

    // POST /salary - Issue salary
    if (method === 'POST') {
      if (!requireRole(user, ['admin'])) {
        return createErrorResponse('Admin access required', 403);
      }

      const { teacher_id, base_salary, bonus, deductions, month, year, payment_date, payment_method } = await req.json();

      const net_salary = (base_salary || 0) + (bonus || 0) - (deductions || 0);

      const { data, error } = await supabase.from('salary').insert({
        teacher_id,
        base_salary,
        bonus,
        deductions,
        net_salary,
        month,
        year,
        payment_date,
        payment_method,
        status: 'paid',
      }).select().single();

      if (error) throw error;
      return createSuccessResponse({ salary: data, message: 'Salary issued' }, 201);
    }

    // PUT /salary/:id
    if (method === 'PUT') {
      if (!requireRole(user, ['admin'])) {
        return createErrorResponse('Admin access required', 403);
      }

      const salaryId = url.pathname.split('/').pop();
      const updates = await req.json();

      // Recalculate net if base/bonus/deductions changed
      if (updates.base_salary !== undefined || updates.bonus !== undefined || updates.deductions !== undefined) {
        const { data: existing } = await supabase
          .from('salary')
          .select('base_salary, bonus, deductions')
          .eq('id', salaryId)
          .single();

        const base = updates.base_salary ?? existing?.base_salary ?? 0;
        const bonus = updates.bonus ?? existing?.bonus ?? 0;
        const deductions = updates.deductions ?? existing?.deductions ?? 0;
        updates.net_salary = base + bonus - deductions;
      }

      const { data, error } = await supabase
        .from('salary')
        .update(updates)
        .eq('id', salaryId)
        .select()
        .single();

      if (error) throw error;
      return createSuccessResponse({ salary: data, message: 'Salary updated' });
    }

    return createErrorResponse('Method not allowed', 405);
  } catch (error: any) {
    return createErrorResponse(error.message || 'Server error', 500);
  }
});
