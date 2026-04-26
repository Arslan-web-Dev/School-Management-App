// API: Grades/Exam Results
// Routes: GET /grades, POST /grades, PUT /grades/:id, DELETE /grades/:id
// Roles: admin, teacher (enter for own classes), student/parent (view own only)

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
    // GET /grades - List grades
    if (method === 'GET') {
      let query = supabase
        .from('grades')
        .select('*, students(name, roll_number), subjects(name)');

      // Student: own grades only
      if (user.role === 'student') {
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (student) query = query.eq('student_id', student.id);
      }
      // Parent: children's grades only
      else if (user.role === 'parent') {
        const { data: links } = await supabase
          .from('parent_children')
          .select('student_id')
          .eq('parent_id', user.id);
        const studentIds = links?.map((l: any) => l.student_id) || [];
        if (studentIds.length > 0) query = query.in('student_id', studentIds);
      }
      // Teacher: grades for assigned classes
      else if (user.role === 'teacher') {
        const { data: assignments } = await supabase
          .from('class_assignments')
          .select('class_id')
          .eq('teacher_id', user.id);
        const classIds = assignments?.map((a: any) => a.class_id) || [];
        if (classIds.length > 0) {
          const { data: students } = await supabase
            .from('students')
            .select('id')
            .in('class_id', classIds);
          const studentIds = students?.map((s: any) => s.id) || [];
          if (studentIds.length > 0) query = query.in('student_id', studentIds);
        }
      }

      const studentId = url.searchParams.get('studentId');
      const classId = url.searchParams.get('classId');
      const examType = url.searchParams.get('examType');

      if (studentId) query = query.eq('student_id', studentId);
      if (examType) query = query.eq('exam_type', examType);

      const { data, error } = await query.order('exam_date', { ascending: false });

      if (error) throw error;
      return createSuccessResponse({ grades: data || [] });
    }

    // POST /grades - Create grade
    if (method === 'POST') {
      if (!requireRole(user, ['admin', 'teacher'])) {
        return createErrorResponse('Not authorized', 403);
      }

      const { student_id, subject_id, exam_type, marks_obtained, total_marks, grade, remarks, exam_date } = await req.json();

      // Teachers can only grade their assigned students
      if (user.role === 'teacher') {
        const { data: student } = await supabase
          .from('students')
          .select('class_id')
          .eq('id', student_id)
          .single();

        if (student) {
          const { data: assignment } = await supabase
            .from('class_assignments')
            .select('id')
            .eq('teacher_id', user.id)
            .eq('class_id', student.class_id)
            .single();

          if (!assignment) {
            return createErrorResponse('Not assigned to this student\'s class', 403);
          }
        }
      }

      const { data, error } = await supabase.from('grades').insert({
        student_id,
        subject_id,
        exam_type,
        marks_obtained,
        total_marks,
        grade,
        remarks,
        exam_date,
        created_by: user.id,
      }).select().single();

      if (error) throw error;
      return createSuccessResponse({ grade: data, message: 'Grade added' }, 201);
    }

    // PUT /grades/:id
    if (method === 'PUT') {
      if (!requireRole(user, ['admin', 'teacher'])) {
        return createErrorResponse('Not authorized', 403);
      }

      const gradeId = url.pathname.split('/').pop();
      const updates = await req.json();

      // Teachers can only update their own entries
      if (user.role === 'teacher') {
        const { data: existing } = await supabase
          .from('grades')
          .select('created_by')
          .eq('id', gradeId)
          .single();

        if (existing && existing.created_by !== user.id) {
          return createErrorResponse('Can only edit your own entries', 403);
        }
      }

      const { data, error } = await supabase
        .from('grades')
        .update(updates)
        .eq('id', gradeId)
        .select()
        .single();

      if (error) throw error;
      return createSuccessResponse({ grade: data, message: 'Grade updated' });
    }

    // DELETE /grades/:id
    if (method === 'DELETE') {
      if (!requireRole(user, ['admin', 'teacher'])) {
        return createErrorResponse('Not authorized', 403);
      }

      const gradeId = url.pathname.split('/').pop();

      if (user.role === 'teacher') {
        const { data: existing } = await supabase
          .from('grades')
          .select('created_by')
          .eq('id', gradeId)
          .single();

        if (existing && existing.created_by !== user.id) {
          return createErrorResponse('Can only delete your own entries', 403);
        }
      }

      const { error } = await supabase.from('grades').delete().eq('id', gradeId);

      if (error) throw error;
      return createSuccessResponse({ message: 'Grade deleted' });
    }

    return createErrorResponse('Method not allowed', 405);
  } catch (error: any) {
    return createErrorResponse(error.message || 'Server error', 500);
  }
});
