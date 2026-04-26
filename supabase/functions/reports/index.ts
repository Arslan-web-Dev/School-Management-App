// API: Reports & Analytics
// Routes: GET /reports/attendance, GET /reports/grades, GET /reports/fees
// Roles: admin (all), teacher (own classes)

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
  const reportType = url.pathname.split('/').pop();

  try {
    // Attendance Report
    if (reportType === 'attendance') {
      const classId = url.searchParams.get('classId');
      const month = url.searchParams.get('month');
      const year = url.searchParams.get('year') || new Date().getFullYear().toString();

      if (!classId) {
        return createErrorResponse('classId required', 400);
      }

      // Teachers: verify class assignment
      if (user.role === 'teacher') {
        const { data: assignment } = await supabase
          .from('class_assignments')
          .select('id')
          .eq('teacher_id', user.id)
          .eq('class_id', classId)
          .single();
        if (!assignment) {
          return createErrorResponse('Not assigned to this class', 403);
        }
      }

      // Get attendance summary
      const { data: students } = await supabase
        .from('students')
        .select('id, name, roll_number')
        .eq('class_id', classId);

      const studentIds = students?.map((s: any) => s.id) || [];

      const { data: attendance } = await supabase
        .from('attendance')
        .select('student_id, status, date')
        .in('student_id', studentIds)
        .gte('date', `${year}-${month || '01'}-01`)
        .lte('date', `${year}-${month || '12'}-31`);

      const report = students?.map((s: any) => {
        const records = attendance?.filter((a: any) => a.student_id === s.id) || [];
        const total = records.length;
        const present = records.filter((r: any) => r.status === 'present').length;
        const late = records.filter((r: any) => r.status === 'late').length;
        const absent = records.filter((r: any) => r.status === 'absent').length;
        return {
          ...s,
          totalDays: total,
          present: present + late,
          absent,
          percentage: total ? Math.round(((present + late) / total) * 100) : 0,
        };
      });

      return createSuccessResponse({ report, type: 'attendance' });
    }

    // Grade Report
    if (reportType === 'grades') {
      const classId = url.searchParams.get('classId');
      const examType = url.searchParams.get('examType');

      if (!classId) {
        return createErrorResponse('classId required', 400);
      }

      const { data: students } = await supabase
        .from('students')
        .select('id, name, roll_number')
        .eq('class_id', classId);

      let query = supabase
        .from('grades')
        .select('*, subjects(name), students(name)')
        .in('student_id', students?.map((s: any) => s.id) || []);

      if (examType) query = query.eq('exam_type', examType);

      const { data: grades } = await query;

      // Calculate class average per subject
      const subjects: Record<string, { name: string; total: number; count: number }> = {};
      grades?.forEach((g: any) => {
        const subjectId = g.subject_id;
        if (!subjects[subjectId]) {
          subjects[subjectId] = { name: g.subjects.name, total: 0, count: 0 };
        }
        subjects[subjectId].total += (g.marks_obtained / g.total_marks) * 100;
        subjects[subjectId].count++;
      });

      const subjectAverages = Object.entries(subjects).map(([id, s]) => ({
        subjectId: id,
        name: s.name,
        average: Math.round(s.total / s.count),
      }));

      return createSuccessResponse({
        grades: grades || [],
        subjectAverages,
        type: 'grades',
      });
    }

    // Fee Report
    if (reportType === 'fees') {
      if (!requireRole(user, ['admin'])) {
        return createErrorResponse('Admin access required', 403);
      }

      const month = url.searchParams.get('month');
      const year = url.searchParams.get('year') || new Date().getFullYear().toString();

      const { data: fees } = await supabase
        .from('fees')
        .select('status, amount, fee_type')
        .eq('month', month)
        .eq('year', year);

      const summary = {
        totalExpected: fees?.reduce((sum: number, f: any) => sum + (f.amount || 0), 0) || 0,
        totalCollected: fees?.filter((f: any) => f.status === 'paid').reduce((sum: number, f: any) => sum + (f.amount || 0), 0) || 0,
        totalPending: fees?.filter((f: any) => f.status === 'pending').reduce((sum: number, f: any) => sum + (f.amount || 0), 0) || 0,
        totalOverdue: fees?.filter((f: any) => f.status === 'overdue').reduce((sum: number, f: any) => sum + (f.amount || 0), 0) || 0,
        byType: {} as Record<string, number>,
      };

      fees?.forEach((f: any) => {
        if (!summary.byType[f.fee_type]) summary.byType[f.fee_type] = 0;
        summary.byType[f.fee_type] += f.amount || 0;
      });

      return createSuccessResponse({ summary, type: 'fees' });
    }

    return createErrorResponse('Report type not found', 404);
  } catch (error: any) {
    return createErrorResponse(error.message || 'Server error', 500);
  }
});
