// API Client for Supabase Edge Functions
// Use these helpers to call the server-side API endpoints

import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  };
}

// Generic fetch helper
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${FUNCTIONS_URL}/${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ====================
// Users API
// ====================
export const usersApi = {
  list: () => apiFetch('users'),
  create: (userData: {
    email: string;
    password: string;
    fullName: string;
    role: string;
    phone?: string;
  }) => apiFetch('users', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  delete: (userId: string) => apiFetch(`users/${userId}`, {
    method: 'DELETE',
  }),
};

// ====================
// Students API
// ====================
export const studentsApi = {
  list: () => apiFetch('students'),
  create: (studentData: {
    name: string;
    email: string;
    classId: string;
    rollNumber?: string;
    guardianName?: string;
    guardianPhone?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
  }) => apiFetch('students', {
    method: 'POST',
    body: JSON.stringify(studentData),
  }),
  update: (studentId: string, updates: Record<string, any>) => apiFetch(`students/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }),
  delete: (studentId: string) => apiFetch(`students/${studentId}`, {
    method: 'DELETE',
  }),
};

// ====================
// Attendance API
// ====================
export const attendanceApi = {
  list: (params?: { classId?: string; date?: string; studentId?: string }) => {
    const query = new URLSearchParams();
    if (params?.classId) query.append('classId', params.classId);
    if (params?.date) query.append('date', params.date);
    if (params?.studentId) query.append('studentId', params.studentId);
    return apiFetch(`attendance?${query.toString()}`);
  },
  mark: (records: Array<{
    student_id: string;
    class_id: string;
    date: string;
    status: 'present' | 'absent' | 'late';
  }>) => apiFetch('attendance', {
    method: 'POST',
    body: JSON.stringify({ records }),
  }),
  update: (recordId: string, status: string) => apiFetch(`attendance/${recordId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
};

// ====================
// Grades API
// ====================
export const gradesApi = {
  list: (params?: { studentId?: string; examType?: string }) => {
    const query = new URLSearchParams();
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.examType) query.append('examType', params.examType);
    return apiFetch(`grades?${query.toString()}`);
  },
  create: (gradeData: {
    student_id: string;
    subject_id: string;
    exam_type: string;
    marks_obtained: number;
    total_marks: number;
    grade?: string;
    remarks?: string;
    exam_date?: string;
  }) => apiFetch('grades', {
    method: 'POST',
    body: JSON.stringify(gradeData),
  }),
  update: (gradeId: string, updates: Record<string, any>) => apiFetch(`grades/${gradeId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }),
  delete: (gradeId: string) => apiFetch(`grades/${gradeId}`, {
    method: 'DELETE',
  }),
};

// ====================
// Fees API
// ====================
export const feesApi = {
  list: (params?: { studentId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.status) query.append('status', params.status);
    return apiFetch(`fees?${query.toString()}`);
  },
  create: (feeData: {
    student_id: string;
    fee_type: string;
    amount: number;
    due_date: string;
    month?: string;
    year?: number;
    description?: string;
  }) => apiFetch('fees', {
    method: 'POST',
    body: JSON.stringify(feeData),
  }),
  update: (feeId: string, updates: Record<string, any>) => apiFetch(`fees/${feeId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }),
  delete: (feeId: string) => apiFetch(`fees/${feeId}`, {
    method: 'DELETE',
  }),
};

// ====================
// Salary API
// ====================
export const salaryApi = {
  list: (params?: { teacherId?: string; month?: string; year?: string }) => {
    const query = new URLSearchParams();
    if (params?.teacherId) query.append('teacherId', params.teacherId);
    if (params?.month) query.append('month', params.month);
    if (params?.year) query.append('year', params.year);
    return apiFetch(`salary?${query.toString()}`);
  },
  issue: (salaryData: {
    teacher_id: string;
    base_salary: number;
    bonus?: number;
    deductions?: number;
    month: string;
    year: number;
    payment_date?: string;
    payment_method?: string;
  }) => apiFetch('salary', {
    method: 'POST',
    body: JSON.stringify(salaryData),
  }),
  update: (salaryId: string, updates: Record<string, any>) => apiFetch(`salary/${salaryId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }),
};

// ====================
// Reports API
// ====================
export const reportsApi = {
  attendance: (params: { classId: string; month?: string; year?: string }) => {
    const query = new URLSearchParams();
    query.append('classId', params.classId);
    if (params.month) query.append('month', params.month);
    if (params.year) query.append('year', params.year);
    return apiFetch(`reports/attendance?${query.toString()}`);
  },
  grades: (params: { classId: string; examType?: string }) => {
    const query = new URLSearchParams();
    query.append('classId', params.classId);
    if (params.examType) query.append('examType', params.examType);
    return apiFetch(`reports/grades?${query.toString()}`);
  },
  fees: (params: { month?: string; year?: string }) => {
    const query = new URLSearchParams();
    if (params.month) query.append('month', params.month);
    if (params.year) query.append('year', params.year);
    return apiFetch(`reports/fees?${query.toString()}`);
  },
};

// Export all APIs
export const api = {
  users: usersApi,
  students: studentsApi,
  attendance: attendanceApi,
  grades: gradesApi,
  fees: feesApi,
  salary: salaryApi,
  reports: reportsApi,
};

export default api;
