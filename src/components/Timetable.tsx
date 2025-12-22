import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ChronoData, SelectedSection, SLOT_MAP, DAYS, DAY_NAMES } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Clock, Calendar, Plus, Trash2, Search, Info, User, AlertTriangle, GraduationCap } from 'lucide-react';
import rawCourseData from '@/data/chronoscript-raw.json';

const courseData = rawCourseData as ChronoData;

interface ClashInfo {
  section1: SelectedSection;
  section2: SelectedSection;
  day: string;
  slot: number;
}

interface ExamClashInfo {
  course1: string;
  course2: string;
  examType: 'midsem' | 'compre';
  dateTime: string;
}

// Parse ISO exam date to get the start time
const parseExamTime = (isoString: string): { start: Date; end: Date } | null => {
  if (!isoString) return null;
  const [startStr, endStr] = isoString.split('|');
  if (!startStr || !endStr) return null;
  return { start: new Date(startStr), end: new Date(endStr) };
};

// Check if two exam times overlap
const examsOverlap = (exam1: string, exam2: string): boolean => {
  const time1 = parseExamTime(exam1);
  const time2 = parseExamTime(exam2);
  if (!time1 || !time2) return false;
  
  // Exams overlap if one starts before the other ends
  return time1.start < time2.end && time2.start < time1.end;
};

// Format exam time for display
const formatExamTime = (isoString: string): string => {
  const time = parseExamTime(isoString);
  if (!time) return 'TBA';
  return time.start.toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function Timetable() {
  const [selectedSections, setSelectedSections] = useLocalStorage<SelectedSection[]>('selectedSections', []);
  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [selectedSectionName, setSelectedSectionName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCourse = selectedCourseCode ? courseData.courses[selectedCourseCode] : null;

  // Get unique course codes from selected sections
  const selectedCourseCodes = useMemo(() => 
    Array.from(new Set(selectedSections.map(s => s.courseCode))),
    [selectedSections]
  );

  // Detect schedule clashes
  const clashes = useMemo(() => {
    const clashList: ClashInfo[] = [];
    
    for (let i = 0; i < selectedSections.length; i++) {
      for (let j = i + 1; j < selectedSections.length; j++) {
        const s1 = selectedSections[i];
        const s2 = selectedSections[j];
        
        // Skip if same course (multiple schedules for same section)
        if (s1.courseCode === s2.courseCode && s1.section === s2.section) continue;
        
        for (const day of s1.days) {
          if (s2.days.includes(day)) {
            for (const slot of s1.slots) {
              if (s2.slots.includes(slot)) {
                clashList.push({ section1: s1, section2: s2, day, slot });
              }
            }
          }
        }
      }
    }
    
    return clashList;
  }, [selectedSections]);

  // Detect exam clashes
  const examClashes = useMemo(() => {
    const clashList: ExamClashInfo[] = [];
    
    for (let i = 0; i < selectedCourseCodes.length; i++) {
      for (let j = i + 1; j < selectedCourseCodes.length; j++) {
        const code1 = selectedCourseCodes[i];
        const code2 = selectedCourseCodes[j];
        const course1 = courseData.courses[code1];
        const course2 = courseData.courses[code2];
        
        const exam1 = course1?.exams_iso?.[0];
        const exam2 = course2?.exams_iso?.[0];
        
        if (!exam1 || !exam2) continue;
        
        // Check midsem clash
        if (exam1.midsem && exam2.midsem && examsOverlap(exam1.midsem, exam2.midsem)) {
          clashList.push({
            course1: code1,
            course2: code2,
            examType: 'midsem',
            dateTime: formatExamTime(exam1.midsem)
          });
        }
        
        // Check compre clash
        if (exam1.compre && exam2.compre && examsOverlap(exam1.compre, exam2.compre)) {
          clashList.push({
            course1: code1,
            course2: code2,
            examType: 'compre',
            dateTime: formatExamTime(exam1.compre)
          });
        }
      }
    }
    
    return clashList;
  }, [selectedCourseCodes]);

  // Get section types (L, T, P) and their available sections
  const availableSections = useMemo(() => {
    if (!selectedCourse?.sections) return [];
    
    const sections: { name: string; type: 'L' | 'T' | 'P'; instructor: string[]; room: string }[] = [];
    
    for (const [sectionName, sectionData] of Object.entries(selectedCourse.sections)) {
      const type = sectionName.charAt(0) as 'L' | 'T' | 'P';
      if (!['L', 'T', 'P'].includes(type)) continue;
      
      const firstSchedule = sectionData.schedule[0];
      sections.push({
        name: sectionName,
        type,
        instructor: sectionData.instructor,
        room: firstSchedule?.room || 'TBA',
      });
    }
    
    return sections.sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCourse]);

  const filteredCourses = useMemo(() => {
    return Object.entries(courseData.courses)
      .filter(([code, course]) => {
        if (Object.keys(course.sections).length === 0) return false;
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return code.toLowerCase().includes(query) || course.course_name.toLowerCase().includes(query);
      })
      .slice(0, 100);
  }, [searchQuery]);

  // Check if adding a section would cause clash
  const wouldClash = useMemo(() => {
    if (!selectedCourseCode || !selectedSectionName || !selectedCourse) return false;
    
    const sectionData = selectedCourse.sections[selectedSectionName];
    if (!sectionData) return false;

    for (const sched of sectionData.schedule) {
      for (const existing of selectedSections) {
        for (const day of sched.days) {
          if (existing.days.includes(day)) {
            for (const slot of sched.hours) {
              if (existing.slots.includes(slot)) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }, [selectedCourseCode, selectedSectionName, selectedCourse, selectedSections]);

  const addSection = () => {
    if (!selectedCourseCode || !selectedSectionName || !selectedCourse) return;

    const sectionData = selectedCourse.sections[selectedSectionName];
    if (!sectionData) return;

    const sectionType = selectedSectionName.charAt(0) as 'L' | 'T' | 'P';

    const newSections: SelectedSection[] = sectionData.schedule.map((sched) => ({
      courseCode: selectedCourseCode,
      courseTitle: selectedCourse.course_name,
      sectionType,
      section: selectedSectionName,
      instructor: sectionData.instructor,
      room: sched.room,
      days: sched.days,
      slots: sched.hours.filter((h) => h >= 1 && h <= 11),
    }));

    const updated = [...selectedSections, ...newSections];
    setSelectedSections(updated);
    setSelectedCourseCode('');
    setSelectedSectionName('');
    setSearchQuery('');
  };

  const removeCourse = (courseCode: string) => {
    const updated = selectedSections.filter((s) => s.courseCode !== courseCode);
    setSelectedSections(updated);
  };

  const timetableGrid = useMemo(() => {
    const grid: Record<string, Record<number, SelectedSection[]>> = {};
    
    DAYS.forEach((day) => {
      grid[day] = {};
      for (let slot = 1; slot <= 11; slot++) {
        grid[day][slot] = [];
      }
    });

    selectedSections.forEach((entry) => {
      entry.days.forEach((day) => {
        entry.slots.forEach((slot) => {
          if (grid[day] && slot >= 1 && slot <= 11) {
            grid[day][slot].push(entry);
          }
        });
      });
    });

    return grid;
  }, [selectedSections]);

  const getSlotColor = (entry: SelectedSection | null, isClash: boolean = false) => {
    if (!entry) return '';
    if (isClash) return 'bg-destructive/30 border-destructive text-destructive';
    if (entry.sectionType === 'L') return 'bg-primary/20 border-primary/40 text-primary';
    if (entry.sectionType === 'T') return 'bg-warning/20 border-warning/40 text-warning';
    if (entry.sectionType === 'P') return 'bg-grade-b/20 border-grade-b/40 text-grade-b';
    return 'bg-accent/50 border-accent text-foreground';
  };

  const handleCourseChange = (code: string) => {
    setSelectedCourseCode(code);
    setSelectedSectionName('');
  };

  return (
    <div className="space-y-6">
      {/* Schedule Clash Warning */}
      {clashes.length > 0 && (
        <Card className="glass-card p-4 border-destructive/50 bg-destructive/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">Timetable Clashes Detected!</h3>
              <div className="mt-2 space-y-1">
                {clashes.slice(0, 5).map((clash, i) => (
                  <p key={i} className="text-sm text-destructive/80">
                    <span className="font-medium">{clash.section1.courseCode} ({clash.section1.section})</span>
                    {' '}clashes with{' '}
                    <span className="font-medium">{clash.section2.courseCode} ({clash.section2.section})</span>
                    {' '}on {DAY_NAMES[clash.day]} at {SLOT_MAP[clash.slot]}
                  </p>
                ))}
                {clashes.length > 5 && (
                  <p className="text-sm text-destructive/60">...and {clashes.length - 5} more clashes</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Exam Clash Warning */}
      {examClashes.length > 0 && (
        <Card className="glass-card p-4 border-warning/50 bg-warning/10">
          <div className="flex items-start gap-3">
            <GraduationCap className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-warning">Exam Clashes Detected!</h3>
              <div className="mt-2 space-y-1">
                {examClashes.map((clash, i) => (
                  <p key={i} className="text-sm text-warning/80">
                    <span className="font-medium">{clash.course1}</span>
                    {' '}and{' '}
                    <span className="font-medium">{clash.course2}</span>
                    {' '}have overlapping <span className="font-medium uppercase">{clash.examType}</span> exams
                    {' '}({clash.dateTime})
                  </p>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}


      {/* Add Section */}
      <Card className="glass-card p-6">
        <h3 className="font-semibold mb-4">Add Course Section</h3>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses by code or name..."
            className="pl-10 bg-secondary/50 border-border/50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Course</label>
            <Select value={selectedCourseCode} onValueChange={handleCourseChange}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] bg-popover">
                {filteredCourses.map(([code, course]) => (
                  <SelectItem key={code} value={code}>
                    {code} - {course.course_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Section</label>
            <Select 
              value={selectedSectionName} 
              onValueChange={setSelectedSectionName}
              disabled={!selectedCourseCode || availableSections.length === 0}
            >
              <SelectTrigger className={`bg-secondary/50 border-border/50 ${wouldClash ? 'border-destructive' : ''}`}>
                <SelectValue placeholder={availableSections.length === 0 ? "No sections" : "Select section"} />
              </SelectTrigger>
              <SelectContent className="bg-popover max-h-[300px]">
                {availableSections.map((s) => (
                  <SelectItem key={s.name} value={s.name}>
                    <span className={`inline-block w-8 ${
                      s.type === 'L' ? 'text-primary' :
                      s.type === 'T' ? 'text-warning' :
                      'text-grade-b'
                    }`}>{s.name}</span>
                    <span className="text-muted-foreground ml-2">• {s.room}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground invisible">Action</label>
            <Button
              onClick={addSection}
              disabled={!selectedCourseCode || !selectedSectionName}
              className={`w-full ${wouldClash ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'}`}
            >
              {wouldClash && <AlertTriangle className="w-4 h-4 mr-2" />}
              <Plus className="w-4 h-4 mr-2" />
              {wouldClash ? 'Add (Clash!)' : 'Add'}
            </Button>
          </div>
        </div>

        {/* Clash warning for selected section */}
        {wouldClash && (
          <div className="mt-3 p-3 rounded-lg bg-destructive/20 border border-destructive/30">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>This section will clash with existing courses in your timetable!</span>
            </div>
          </div>
        )}

        {selectedCourse && !wouldClash && (
          <div className="mt-4 p-3 rounded-lg bg-secondary/30">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm">
                <span className="font-medium text-foreground">{selectedCourseCode}</span>
                <span className="text-muted-foreground"> - {selectedCourse.course_name} ({selectedCourse.units} credits)</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableSections.map((s) => (
                    <span
                      key={s.name}
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        s.type === 'L' ? 'bg-primary/20 text-primary' :
                        s.type === 'T' ? 'bg-warning/20 text-warning' :
                        'bg-grade-b/20 text-grade-b'
                      }`}
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Legend */}
      <Card className="glass-card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary/20 border border-primary/40" />
            <span className="text-sm text-muted-foreground">Lecture (L)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-warning/20 border border-warning/40" />
            <span className="text-sm text-muted-foreground">Tutorial (T)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-grade-b/20 border border-grade-b/40" />
            <span className="text-sm text-muted-foreground">Practical (P)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive/30 border border-destructive" />
            <span className="text-sm text-muted-foreground">Clash</span>
          </div>
        </div>
      </Card>

      {/* Timetable Grid */}
      <Card className="glass-card p-6 overflow-x-auto">
        <div className="flex items-center gap-4 mb-6">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Weekly Schedule</h3>
        </div>
        
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[100px_repeat(6,1fr)] gap-2">
            <div className="flex items-center justify-center p-3 rounded-lg bg-secondary/50 font-semibold">
              <Clock className="w-4 h-4" />
            </div>
            {DAYS.map((day) => (
              <div
                key={day}
                className="p-3 rounded-lg bg-secondary/50 font-semibold text-center"
              >
                {DAY_NAMES[day]}
              </div>
            ))}

            {Array.from({ length: 11 }, (_, i) => i + 1).map((slot) => (
              <div key={`row-${slot}`} className="contents">
                <div
                  className="flex items-center justify-center p-3 rounded-lg bg-secondary/30 text-sm text-muted-foreground"
                >
                  {SLOT_MAP[slot]}
                </div>
                {DAYS.map((day) => {
                  const entries = timetableGrid[day][slot];
                  const isClash = entries.length > 1;
                  const entry = entries[0] || null;
                  const colorClass = getSlotColor(entry, isClash);
                  
                  return (
                    <div
                      key={`${day}-${slot}`}
                      className={`p-3 rounded-lg border transition-all duration-200 min-h-[60px] ${
                        entry
                          ? `${colorClass} hover:scale-[1.02]`
                          : 'bg-secondary/20 border-transparent'
                      }`}
                    >
                      {isClash ? (
                        <div className="text-center">
                          <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
                          <p className="font-semibold text-xs">CLASH</p>
                          <p className="text-[10px]">{entries.length} courses</p>
                        </div>
                      ) : entry && (
                        <div className="text-center">
                          <p className="font-semibold text-sm">{entry.courseCode}</p>
                          <p className="text-xs opacity-80">{entry.section}</p>
                          <p className="text-xs opacity-60">{entry.room}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Selected Sections List */}
      {selectedSections.length > 0 && (
        <Card className="glass-card p-6">
          <h3 className="font-semibold mb-4">Added Courses ({new Set(selectedSections.map(s => s.courseCode)).size})</h3>
          <div className="space-y-3">
            {Array.from(new Set(selectedSections.map((s) => s.courseCode))).map((courseCode) => {
              const courseSections = selectedSections.filter((s) => s.courseCode === courseCode);
              const first = courseSections[0];
              
              const uniqueSections = new Map<string, { type: string; section: string; instructor: string[] }>();
              courseSections.forEach((s) => {
                const key = `${s.sectionType}:${s.section}`;
                if (!uniqueSections.has(key)) {
                  uniqueSections.set(key, { type: s.sectionType, section: s.section, instructor: s.instructor });
                }
              });

              // Check if this course has clashes
              const hasClash = clashes.some(
                (c) => c.section1.courseCode === courseCode || c.section2.courseCode === courseCode
              );

              return (
                <div
                  key={courseCode}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    hasClash 
                      ? 'bg-destructive/10 border-destructive/30' 
                      : 'bg-secondary/50 border-border/30'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{courseCode}</p>
                      {hasClash && <AlertTriangle className="w-4 h-4 text-destructive" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{first.courseTitle}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Array.from(uniqueSections.values()).map(({ type, section, instructor }) => (
                        <div key={`${type}-${section}`} className="flex items-center gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              type === 'L' ? 'bg-primary/20 text-primary' :
                              type === 'T' ? 'bg-warning/20 text-warning' :
                              'bg-grade-b/20 text-grade-b'
                            }`}
                          >
                            {section}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {instructor[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCourse(courseCode)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
