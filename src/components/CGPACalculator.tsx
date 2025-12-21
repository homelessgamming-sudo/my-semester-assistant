import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChronoData, SelectedCourse, GRADES } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Plus, Trash2, Calculator, BookOpen, TrendingUp, Search } from 'lucide-react';
import rawCourseData from '@/data/chronoscript-raw.json';

const courseData = rawCourseData as ChronoData;

export function CGPACalculator() {
  const [selectedCourses, setSelectedCourses] = useLocalStorage<SelectedCourse[]>('selectedCourses', []);
  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [previousCredits, setPreviousCredits] = useState(0);
  const [previousGradePoints, setPreviousGradePoints] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const addCourse = () => {
    if (!selectedCourseCode || !selectedGrade) return;

    const course = courseData.courses[selectedCourseCode];
    if (!course) return;

    const newCourse: SelectedCourse = {
      courseCode: selectedCourseCode,
      courseTitle: course.course_name,
      credits: course.units,
      grade: selectedGrade,
    };

    const updated = [...selectedCourses, newCourse];
    setSelectedCourses(updated);
    setSelectedCourseCode('');
    setSelectedGrade('');
  };

  const removeCourse = (courseCode: string) => {
    const updated = selectedCourses.filter((c) => c.courseCode !== courseCode);
    setSelectedCourses(updated);
  };

  const { sgpa, cgpa } = useMemo(() => {
    const semesterCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);
    const semesterGradePoints = selectedCourses.reduce(
      (sum, c) => sum + c.credits * (GRADES[c.grade] || 0),
      0
    );

    const sgpa = semesterCredits > 0 ? semesterGradePoints / semesterCredits : 0;

    const totalCredits = semesterCredits + previousCredits;
    const totalGradePoints = semesterGradePoints + previousGradePoints;
    const cgpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

    return { sgpa, cgpa };
  }, [selectedCourses, previousCredits, previousGradePoints]);

  const availableCourses = useMemo(() => {
    return Object.entries(courseData.courses)
      .filter(([code]) => !selectedCourses.find((c) => c.courseCode === code))
      .filter(([code, course]) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return code.toLowerCase().includes(query) || course.course_name.toLowerCase().includes(query);
      })
      .slice(0, 100);
  }, [selectedCourses, searchQuery]);

  const getGradeColor = (grade: string) => {
    if (grade === 'A' || grade === 'A-') return 'text-grade-a';
    if (grade === 'B' || grade === 'B-') return 'text-grade-b';
    if (grade === 'C' || grade === 'C-') return 'text-grade-c';
    if (grade === 'D') return 'text-grade-d';
    return 'text-grade-e';
  };

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
              <p className="text-sm text-muted-foreground">SGPA</p>
              <p className="text-3xl font-bold gradient-text">{sgpa.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CGPA</p>
              <p className="text-3xl font-bold gradient-text">{cgpa.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Credits</p>
              <p className="text-3xl font-bold">{selectedCourses.reduce((sum, c) => sum + c.credits, 0)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Source Info */}
      <Card className="glass-card p-4">
        <p className="text-sm text-muted-foreground">
          📚 Data source: <span className="text-primary font-medium">BITS Hyderabad - {courseData.metadata.acadYear}-{courseData.metadata.acadYear + 1} Semester {courseData.metadata.semester}</span>
          {' '}• {Object.keys(courseData.courses).length} courses loaded from chronoscript
        </p>
      </Card>

      {/* Previous Semester (for CGPA) */}
      <Card className="glass-card p-6">
        <h3 className="font-semibold mb-4">Previous Semesters (Optional)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Total Credits Earned</Label>
            <Input
              type="number"
              value={previousCredits || ''}
              onChange={(e) => setPreviousCredits(Number(e.target.value))}
              placeholder="0"
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Total Grade Points</Label>
            <Input
              type="number"
              value={previousGradePoints || ''}
              onChange={(e) => setPreviousGradePoints(Number(e.target.value))}
              placeholder="0"
              className="bg-secondary/50 border-border/50"
            />
          </div>
        </div>
      </Card>

      {/* Add Course */}
      <Card className="glass-card p-6">
        <h3 className="font-semibold mb-4">Add Course</h3>
        
        {/* Search */}
        <div className="relative mb-4">
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
                    {code} - {course.course_name} ({course.units} cr)
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
            disabled={!selectedCourseCode || !selectedGrade}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </Card>

      {/* Selected Courses */}
      {selectedCourses.length > 0 && (
        <Card className="glass-card p-6">
          <h3 className="font-semibold mb-4">Selected Courses ({selectedCourses.length})</h3>
          <div className="space-y-3">
            {selectedCourses.map((course) => (
              <div
                key={course.courseCode}
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border/30"
              >
                <div className="flex-1">
                  <p className="font-medium">{course.courseCode}</p>
                  <p className="text-sm text-muted-foreground">{course.courseTitle}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{course.credits} cr</span>
                  <span className={`font-bold ${getGradeColor(course.grade)}`}>
                    {course.grade}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCourse(course.courseCode)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
