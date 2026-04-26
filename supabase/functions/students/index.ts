// API: Students Management
// Routes: GET /students, POST /students, PUT /students/:id, DELETE /students/:id
// Roles: admin, teacher (view only own classes)

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
  const studentId = url.pathname.split('/').pop();

  try {
    // GET /students - List students
    if (method === 'GET') {
      let query = supabase
        .from('students')
        .select('id, roll_number, name, email, status, admission_date, classes(name, section), profiles(full_name)');

      // Teachers only see students from their assigned classes
      if (user.role === 'teacher') {
        const { data: assignments } = await supabase
          .from('class_assignments')
          .select('class_id')
          .eq('teacher_id', user.id);

        const classIds = assignments?.map((a: any) => a.class_id) || [];
        if (classIds.length === 0) {
          return createSuccessResponse({ students: [] });
        }
        query = query.in('class_id', classIds);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      return createSuccessResponse({ students: data || [] });
    }

    // POST /students - Create student
    if (method === 'POST') {
      if (!requireRole(user, ['admin'])) {
        return createErrorResponse('Admin access required', 403);
      }

      const { name, email, classId, rollNumber, guardianName, guardianPhone, dateOfBirth, gender, address } = await req.json();

      const { data, error } = await supabase.from('students').insert({
        name,
        email,
        class_id: classId,
        roll_number: rollNumber,
        guardian_name: guardianName,
        guardian_phone: guardianPhone,
        date_of_birth: dateOfBirth,
        gender,
        address,
        status: 'active',
      }).select().single();

      if (error) throw error;
      return createSuccessResponse({ student: data, message: 'Student created' }, 201);
    }

    // PUT /students/:id - Update student
    if (method === 'PUT' && studentId && studentId !== 'students') {
      if (!requireRole(user, ['admin'])) {
        return createErrorResponse('Admin access required', 403);
      }

      const updates = await req.json();

      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', studentId)
        .select()
        .single();

      if (error) throw error;
      return createSuccessResponse({ student: data, message: 'Student updated' });
    }

    // DELETE /students/:id
    if (method === 'DELETE' && studentId && studentId !== 'students') {
      if (!requireRole(user, ['admin'])) {
        return createErrorResponse('Admin access required', 403);
      }

      const { error } = await supabase.from('students').delete().eq('id', studentId);

      if (error) throw error;
      return createSuccessResponse({ message: 'Student deleted' });
    }

    return createErrorResponse('Method not allowed', 405);
  } catch (error: any) {
    return createErrorResponse(error.message || 'Server error', 500);
  }
});
