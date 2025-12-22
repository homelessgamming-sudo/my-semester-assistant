import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChronoData, SemesterRecord, GRADES } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Plus, Trash2, Calculator, BookOpen, TrendingUp, Search, ChevronDown, ChevronUp } from 'lucide-react';
import cgpaCourseData from '@/data/unique_courses_with_credits.json';

// CGPA-specific course data structure
interface CGPACourse {
  courseTitle: string;
  credits: number;
}

interface CGPAData {
  totalCourses: number;
  totalCredits: number;
  courses: Record<string, CGPACourse>;
}

const courseData = cgpaCourseData as CGPAData;

const SEMESTER_OPTIONS = [
  '1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2', '5-1', '5-2'
];

export function CGPACalculator() {
  const [semesterRecords, setSemesterRecords] = useLocalStorage<SemesterRecord[]>('semesterRecords', []);
  const [activeSemester, setActiveSemester] = useState('');
  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSemesters, setExpandedSemesters] = useState<string[]>([]);

  // Get or create semester record
  const getOrCreateSemester = (semester: string) => {
    const existing = semesterRecords.find(r => r.semester === semester);
    if (existing) return existing;
    return { semester, courses: [] };
  };

  const currentSemesterRecord = activeSemester ? getOrCreateSemester(activeSemester) : null;

  const MAX_CREDITS_PER_SEM = 25;

  // Check if adding course would exceed limit
  const wouldExceedLimit = useMemo(() => {
    if (!selectedCourseCode || !activeSemester) return false;
    const course = courseData.courses[selectedCourseCode];
    if (!course) return false;
    const currentCreds = currentSemesterRecord?.courses.reduce((sum, c) => sum + c.credits, 0) || 0;
    return currentCreds + course.credits > MAX_CREDITS_PER_SEM;
  }, [selectedCourseCode, activeSemester, currentSemesterRecord]);

  const addCourse = () => {
    if (!selectedCourseCode || !selectedGrade || !activeSemester) return;

    const course = courseData.courses[selectedCourseCode];
    if (!course) return;

    // Check credit limit
    const currentCreds = currentSemesterRecord?.courses.reduce((sum, c) => sum + c.credits, 0) || 0;
    if (currentCreds + course.credits > MAX_CREDITS_PER_SEM) return;

    const newCourse = {
      courseCode: selectedCourseCode,
      courseTitle: course.courseTitle,
      credits: course.credits,
      grade: selectedGrade,
    };

    const existingIndex = semesterRecords.findIndex(r => r.semester === activeSemester);
    if (existingIndex >= 0) {
      const updated = [...semesterRecords];
      updated[existingIndex] = {
        ...updated[existingIndex],
        courses: [...updated[existingIndex].courses, newCourse]
      };
      setSemesterRecords(updated);
    } else {
      setSemesterRecords([...semesterRecords, { semester: activeSemester, courses: [newCourse] }]);
    }
    
    setSelectedCourseCode('');
    setSelectedGrade('');
  };

  const removeCourse = (semester: string, courseCode: string) => {
    const updated = semesterRecords.map(record => {
      if (record.semester === semester) {
        return {
          ...record,
          courses: record.courses.filter(c => c.courseCode !== courseCode)
        };
      }
      return record;
    }).filter(r => r.courses.length > 0);
    setSemesterRecords(updated);
  };

  const toggleSemesterExpand = (semester: string) => {
    setExpandedSemesters(prev => 
      prev.includes(semester) 
        ? prev.filter(s => s !== semester)
        : [...prev, semester]
    );
  };

  // Calculate SGPA for a specific semester
  const calculateSGPA = (courses: { credits: number; grade: string }[]) => {
    const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    const totalGradePoints = courses.reduce((sum, c) => sum + c.credits * (GRADES[c.grade] || 0), 0);
    return totalCredits > 0 ? totalGradePoints / totalCredits : 0;
  };

  // Calculate overall CGPA
  const { cgpa, totalCredits, currentSGPA, currentCredits } = useMemo(() => {
    const allCourses = semesterRecords.flatMap(r => r.courses);
    const totalCredits = allCourses.reduce((sum, c) => sum + c.credits, 0);
    const totalGradePoints = allCourses.reduce((sum, c) => sum + c.credits * (GRADES[c.grade] || 0), 0);
    const cgpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

    const currentSemCourses = currentSemesterRecord?.courses || [];
    const currentCredits = currentSemCourses.reduce((sum, c) => sum + c.credits, 0);
    const currentSGPA = calculateSGPA(currentSemCourses);

    return { cgpa, totalCredits, currentSGPA, currentCredits };
  }, [semesterRecords, currentSemesterRecord]);

  const availableCourses = useMemo(() => {
    const currentCourses = currentSemesterRecord?.courses || [];
    return Object.entries(courseData.courses)
      .filter(([code]) => !currentCourses.find((c) => c.courseCode === code))
      .filter(([code, course]) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return code.toLowerCase().includes(query) || course.courseTitle.toLowerCase().includes(query);
      })
      .slice(0, 100);
  }, [currentSemesterRecord, searchQuery]);

  const getGradeColor = (grade: string) => {
    if (grade === 'A' || grade === 'A-') return 'text-grade-a';
    if (grade === 'B' || grade === 'B-') return 'text-grade-b';
    if (grade === 'C' || grade === 'C-') return 'text-grade-c';
    if (grade === 'D') return 'text-grade-d';
    return 'text-grade-e';
  };

  // Get sorted semester records
  const sortedRecords = useMemo(() => {
    return [...semesterRecords].sort((a, b) => {
      const indexA = SEMESTER_OPTIONS.indexOf(a.semester);
      const indexB = SEMESTER_OPTIONS.indexOf(b.semester);
      return indexA - indexB;
    });
  }, [semesterRecords]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <Calculator className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current SGPA</p>
              <p className="text-3xl font-bold gradient-text">{currentSGPA.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{activeSemester || 'Select semester'}</p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overall CGPA</p>
              <p className="text-3xl font-bold gradient-text">{cgpa.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{totalCredits} total credits</p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Credits</p>
              <p className={`text-3xl font-bold ${currentCredits > MAX_CREDITS_PER_SEM ? 'text-destructive' : ''}`}>
                {currentCredits}/{MAX_CREDITS_PER_SEM}
              </p>
              <p className="text-xs text-muted-foreground">{currentSemesterRecord?.courses.length || 0} courses</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Semester Selection & Add Course */}
      <Card className="glass-card p-6">
        <h3 className="font-semibold mb-4">Add Course to Semester</h3>
        
        <div className="space-y-4">
          {/* Semester Selection */}
          <div className="space-y-2">
            <Label>Select Semester</Label>
            <Select value={activeSemester} onValueChange={setActiveSemester}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder="Choose semester" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {SEMESTER_OPTIONS.map((sem) => (
                  <SelectItem key={sem} value={sem}>
                    Semester {sem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeSemester && (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search courses by code or name..."
                  className="pl-10 bg-secondary/50 border-border/50"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Select value={selectedCourseCode} onValueChange={setSelectedCourseCode}>
                    <SelectTrigger className="bg-secondary/50 border-border/50">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] bg-popover">
                      {availableCourses.map(([code, course]) => (
                        <SelectItem key={code} value={code}>
                          {code} - {course.courseTitle} ({course.credits} cr)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-32">
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger className="bg-secondary/50 border-border/50">
                      <SelectValue placeholder="Grade" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {Object.entries(GRADES).map(([grade, points]) => (
                        <SelectItem key={grade} value={grade}>
                          {grade} ({points})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={addCourse}
                  disabled={!selectedCourseCode || !selectedGrade || wouldExceedLimit}
                  className={wouldExceedLimit ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
              
              {wouldExceedLimit && (
                <p className="text-sm text-destructive mt-2">
                  Adding this course would exceed the {MAX_CREDITS_PER_SEM} credit limit for this semester.
                </p>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Semester Records */}
      {sortedRecords.length > 0 && (
        <Card className="glass-card p-6">
          <h3 className="font-semibold mb-4">Semester Records</h3>
          <div className="space-y-4">
            {sortedRecords.map((record) => {
              const sgpa = calculateSGPA(record.courses);
              const credits = record.courses.reduce((sum, c) => sum + c.credits, 0);
              const isExpanded = expandedSemesters.includes(record.semester);

              return (
                <div key={record.semester} className="border border-border/30 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleSemesterExpand(record.semester)}
                    className="w-full flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">Semester {record.semester}</span>
                      <span className="text-sm text-muted-foreground">
                        {record.courses.length} courses • {credits} cr
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-primary font-bold">SGPA: {sgpa.toFixed(2)}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-4 space-y-2">
                      {record.courses.map((course) => (
                        <div
                          key={course.courseCode}
                          className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{course.courseCode}</p>
                            <p className="text-xs text-muted-foreground">{course.courseTitle}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{course.credits} cr</span>
                            <span className={`font-bold text-sm ${getGradeColor(course.grade)}`}>
                              {course.grade}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCourse(record.semester, course.courseCode)}
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}