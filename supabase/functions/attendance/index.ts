// API: Attendance Management
// Routes: GET /attendance, POST /attendance, PUT /attendance/:id
// Roles: admin, teacher (own classes only), parent/student (own view only)

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
    // GET /attendance - Get attendance records
    if (method === 'GET') {
      const classId = url.searchParams.get('classId');
      const date = url.searchParams.get('date');
      const studentId = url.searchParams.get('studentId');

      let query = supabase.from('attendance').select('*, students(name, roll_number)');

      // Parents/Students only see own attendance
      if (user.role === 'student') {
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (student) query = query.eq('student_id', student.id);
      } else if (user.role === 'parent') {
        const { data: links } = await supabase
          .from('parent_children')
          .select('student_id')
          .eq('parent_id', user.id);
        const studentIds = links?.map((l: any) => l.student_id) || [];
        if (studentIds.length > 0) {
          query = query.in('student_id', studentIds);
        }
      } else if (user.role === 'teacher') {
        // Teachers see attendance for their assigned classes
        if (classId) {
          const { data: assignment } = await supabase
            .from('class_assignments')
            .select('id')
            .eq('teacher_id', user.id)
            .eq('class_id', classId)
            .single();
          if (!assignment) {
            return createErrorResponse('Not assigned to this class', 403);
          }
          query = query.eq('class_id', classId);
        }
      } else if (classId) {
        query = query.eq('class_id', classId);
      }

      if (date) query = query.eq('date', date);
      if (studentId) query = query.eq('student_id', studentId);

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      return createSuccessResponse({ attendance: data || [] });
    }

    // POST /attendance - Mark attendance (bulk)
    if (method === 'POST') {
      if (!requireRole(user, ['admin', 'teacher'])) {
        return createErrorResponse('Not authorized', 403);
      }

      const { records } = await req.json(); // Array of { student_id, class_id, date, status }

      // Verify teacher is assigned to these classes
      if (user.role === 'teacher') {
        const classIds = [...new Set(records.map((r: any) => r.class_id))];
        const { data: assignments } = await supabase
          .from('class_assignments')
          .select('class_id')
          .eq('teacher_id', user.id)
          .in('class_id', classIds);

        const allowedClasses = assignments?.map((a: any) => a.class_id) || [];
        const hasUnauthorized = (classIds as string[]).some((id: string) => !allowedClasses.includes(id));

        if (hasUnauthorized) {
          return createErrorResponse('Not assigned to one or more classes', 403);
        }
      }

      const recordsWithMarker = records.map((r: any) => ({
        ...r,
        marked_by: user.id,
      }));

      const { data, error } = await supabase
        .from('attendance')
        .upsert(recordsWithMarker, { onConflict: 'student_id,date' })
        .select();

      if (error) throw error;
      return createSuccessResponse({ attendance: data, message: 'Attendance saved' }, 201);
    }

    // PUT /attendance/:id - Update single record
    if (method === 'PUT') {
      if (!requireRole(user, ['admin', 'teacher'])) {
        return createErrorResponse('Not authorized', 403);
      }

      const recordId = url.pathname.split('/').pop();
      const { status } = await req.json();

      const { data, error } = await supabase
        .from('attendance')
        .update({ status, marked_by: user.id })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      return createSuccessResponse({ attendance: data, message: 'Updated' });
    }

    return createErrorResponse('Method not allowed', 405);
  } catch (error: any) {
    return createErrorResponse(error.message || 'Server error', 500);
  }
});
