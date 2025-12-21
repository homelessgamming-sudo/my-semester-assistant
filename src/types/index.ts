export interface Course {
  courseCode: string;
  courseTitle: string;
  credits: number;
}

export interface CourseData {
  totalCourses: number;
  totalCredits: number;
  courses: Record<string, { courseTitle: string; credits: number }>;
}

export interface TimetableEntry {
  courseCode: string;
  section: string;
  room: string;
  days: string[];
  slots: number[];
  timeRanges: string[];
}

export interface TimetableData {
  entries: TimetableEntry[];
}

export interface SelectedCourse {
  courseCode: string;
  courseTitle: string;
  credits: number;
  grade: string;
  section?: string;
}

export interface AttendanceRecord {
  date: string;
  courseCode: string;
  section: string;
  status: 'present' | 'absent' | 'cancelled' | null;
  timeRange: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  description?: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
}

export interface UserProfile {
  primaryBranch: string;
  dualBranch?: string;
  semester: string;
}

export const GRADES: Record<string, number> = {
  'A': 10,
  'A-': 9,
  'B': 8,
  'B-': 7,
  'C': 6,
  'C-': 5,
  'D': 4,
  'E': 2,
};

export const A_SERIES_BRANCHES = ['A1', 'A2', 'A3', 'A4', 'A5', 'A7', 'A8', 'AA', 'AD', 'AJ'];
export const B_SERIES_BRANCHES = ['B1', 'B2', 'B3', 'B4', 'B5', 'B7'];

export const A_SERIES_SEMESTERS = ['1-1', '1-2', '2-1', '2-2', 'PS-1', '3-1', '3-2', 'ST-1', '4-1', '4-2'];
export const B_SERIES_SEMESTERS = [...A_SERIES_SEMESTERS, 'ST-2', '5-1', '5-2'];

export const TIME_SLOTS: Record<number, string> = {
  1: '08:00-09:00',
  2: '09:00-10:00',
  3: '10:00-11:00',
  4: '11:00-12:00',
  5: '12:00-13:00',
  6: '14:00-15:00',
  7: '15:00-16:00',
  8: '16:00-17:00',
  9: '17:00-18:00',
  10: '18:00-19:00',
};

export const DAYS = ['M', 'T', 'W', 'Th', 'F', 'S'];
export const DAY_NAMES: Record<string, string> = {
  'M': 'Monday',
  'T': 'Tuesday',
  'W': 'Wednesday',
  'Th': 'Thursday',
  'F': 'Friday',
  'S': 'Saturday',
};
