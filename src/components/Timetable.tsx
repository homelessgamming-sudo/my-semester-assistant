import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ChronoData, SelectedSection, SLOT_MAP, DAYS, DAY_NAMES } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Clock, Calendar, Plus, Trash2, Search, Info, User } from 'lucide-react';
import rawCourseData from '@/data/chronoscript-raw.json';

const courseData = rawCourseData as ChronoData;

export function Timetable() {
  const [selectedSections, setSelectedSections] = useLocalStorage<SelectedSection[]>('selectedSections', []);
  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [selectedSectionName, setSelectedSectionName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCourse = selectedCourseCode ? courseData.courses[selectedCourseCode] : null;

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
        // Only show courses with sections
        if (Object.keys(course.sections).length === 0) return false;
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return code.toLowerCase().includes(query) || course.course_name.toLowerCase().includes(query);
      })
      .slice(0, 100);
  }, [searchQuery]);

  const addSection = () => {
    if (!selectedCourseCode || !selectedSectionName || !selectedCourse) return;

    const sectionData = selectedCourse.sections[selectedSectionName];
    if (!sectionData) return;

    const sectionType = selectedSectionName.charAt(0) as 'L' | 'T' | 'P';

    // Add each schedule entry as a separate section
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
    const grid: Record<string, Record<number, SelectedSection | null>> = {};
    
    DAYS.forEach((day) => {
      grid[day] = {};
      for (let slot = 1; slot <= 11; slot++) {
        grid[day][slot] = null;
      }
    });

    selectedSections.forEach((entry) => {
      entry.days.forEach((day) => {
        entry.slots.forEach((slot) => {
          if (grid[day] && slot >= 1 && slot <= 11) {
            grid[day][slot] = entry;
          }
        });
      });
    });

    return grid;
  }, [selectedSections]);

  const getSlotColor = (entry: SelectedSection | null) => {
    if (!entry) return '';
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
      {/* Data Source Info */}
      <Card className="glass-card p-4">
        <p className="text-sm text-muted-foreground">
          📚 Data source: <span className="text-primary font-medium">BITS Hyderabad - {courseData.metadata.acadYear}-{courseData.metadata.acadYear + 1} Semester {courseData.metadata.semester}</span>
          {' '}• Pulled from tabulr.net / chronoscript
        </p>
      </Card>

      {/* Add Section */}
      <Card className="glass-card p-6">
        <h3 className="font-semibold mb-4">Add Course Section</h3>
        
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Course Selection */}
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

          {/* Section */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Section</label>
            <Select 
              value={selectedSectionName} 
              onValueChange={setSelectedSectionName}
              disabled={!selectedCourseCode || availableSections.length === 0}
            >
              <SelectTrigger className="bg-secondary/50 border-border/50">
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

          {/* Add Button */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground invisible">Action</label>
            <Button
              onClick={addSection}
              disabled={!selectedCourseCode || !selectedSectionName}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Info about selected course sections */}
        {selectedCourse && (
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
            {/* Header */}
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

            {/* Time Slots */}
            {Array.from({ length: 11 }, (_, i) => i + 1).map((slot) => (
              <div key={`row-${slot}`} className="contents">
                <div
                  className="flex items-center justify-center p-3 rounded-lg bg-secondary/30 text-sm text-muted-foreground"
                >
                  {SLOT_MAP[slot]}
                </div>
                {DAYS.map((day) => {
                  const entry = timetableGrid[day][slot];
                  const colorClass = getSlotColor(entry);
                  
                  return (
                    <div
                      key={`${day}-${slot}`}
                      className={`p-3 rounded-lg border transition-all duration-200 min-h-[60px] ${
                        entry
                          ? `${colorClass} hover:scale-[1.02]`
                          : 'bg-secondary/20 border-transparent'
                      }`}
                    >
                      {entry && (
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
            {/* Group by course */}
            {Array.from(new Set(selectedSections.map((s) => s.courseCode))).map((courseCode) => {
              const courseSections = selectedSections.filter((s) => s.courseCode === courseCode);
              const first = courseSections[0];
              
              // Get unique section identifiers
              const uniqueSections = new Map<string, { type: string; section: string; instructor: string[] }>();
              courseSections.forEach((s) => {
                const key = `${s.sectionType}:${s.section}`;
                if (!uniqueSections.has(key)) {
                  uniqueSections.set(key, { type: s.sectionType, section: s.section, instructor: s.instructor });
                }
              });

              return (
                <div
                  key={courseCode}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border/30"
                >
                  <div className="flex-1">
                    <p className="font-medium">{courseCode}</p>
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
