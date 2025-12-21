import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CourseData, SLOT_MAP, DAYS, DAY_NAMES } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Clock, Calendar, Plus, Trash2, Search, Info } from 'lucide-react';
import courseData from '@/data/courses.json';

interface SelectedSection {
  courseCode: string;
  courseTitle: string;
  sectionType: 'L' | 'T' | 'P';
  section: string;
  room: string;
  days: string[];
  slots: number[];
  timeRanges: string[];
}

export function Timetable() {
  const data = courseData as CourseData;
  const [selectedSections, setSelectedSections] = useLocalStorage<SelectedSection[]>('selectedSections', []);
  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [selectedSectionType, setSelectedSectionType] = useState<'L' | 'T' | 'P'>('L');
  const [selectedSectionName, setSelectedSectionName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCourse = selectedCourseCode ? data.courses[selectedCourseCode] : null;

  // Get available section types for the selected course
  const availableSectionTypes = useMemo(() => {
    if (!selectedCourse?.sections) return { L: false, T: false, P: false };
    return {
      L: (selectedCourse.sections.L?.length || 0) > 0,
      T: (selectedCourse.sections.T?.length || 0) > 0,
      P: (selectedCourse.sections.P?.length || 0) > 0,
    };
  }, [selectedCourse]);

  // Get unique section names for the selected type
  const availableSections = useMemo(() => {
    if (!selectedCourse?.sections) return [];
    const sections = selectedCourse.sections[selectedSectionType] || [];
    
    // Get unique section names
    const uniqueNames = new Set<string>();
    sections.forEach((s) => {
      if (s.section) uniqueNames.add(s.section);
    });
    
    return Array.from(uniqueNames).map((name) => {
      const firstEntry = sections.find((s) => s.section === name);
      return {
        section: name,
        room: firstEntry?.room || 'TBA',
      };
    });
  }, [selectedCourse, selectedSectionType]);

  const filteredCourses = useMemo(() => {
    return Object.entries(data.courses)
      .filter(([code, course]) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return code.toLowerCase().includes(query) || course.title.toLowerCase().includes(query);
      })
      .slice(0, 100);
  }, [data.courses, searchQuery]);

  const addSection = () => {
    if (!selectedCourseCode || !selectedSectionName || !selectedCourse?.sections) return;

    // Get all entries for this section name
    const allEntries = (selectedCourse.sections[selectedSectionType] || []).filter(
      (s) => s.section === selectedSectionName
    );

    if (allEntries.length === 0) return;

    // Add each entry as a separate section (same section can have multiple day/time entries)
    const newSections: SelectedSection[] = allEntries.map((s) => ({
      courseCode: selectedCourseCode,
      courseTitle: selectedCourse.title,
      sectionType: selectedSectionType,
      section: s.section,
      room: s.room,
      days: s.days,
      slots: s.slots.filter((slot) => slot >= 1 && slot <= 11),
      timeRanges: s.timeRanges.filter((t) => !t.startsWith('UNKNOWN')),
    }));

    const updated = [...selectedSections, ...newSections];
    setSelectedSections(updated);
    setSelectedCourseCode('');
    setSelectedSectionType('L');
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

  // Reset section type and name when course changes
  const handleCourseChange = (code: string) => {
    setSelectedCourseCode(code);
    setSelectedSectionName('');
    // Auto-select first available section type
    const course = data.courses[code];
    if (course?.sections) {
      if (course.sections.L?.length > 0) setSelectedSectionType('L');
      else if (course.sections.T?.length > 0) setSelectedSectionType('T');
      else if (course.sections.P?.length > 0) setSelectedSectionType('P');
    }
  };

  return (
    <div className="space-y-6">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    {code} - {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section Type */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select 
              value={selectedSectionType} 
              onValueChange={(v: 'L' | 'T' | 'P') => {
                setSelectedSectionType(v);
                setSelectedSectionName('');
              }}
              disabled={!selectedCourseCode}
            >
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="L" disabled={!availableSectionTypes.L}>
                  Lecture (L) {!availableSectionTypes.L && '- N/A'}
                </SelectItem>
                <SelectItem value="T" disabled={!availableSectionTypes.T}>
                  Tutorial (T) {!availableSectionTypes.T && '- N/A'}
                </SelectItem>
                <SelectItem value="P" disabled={!availableSectionTypes.P}>
                  Practical (P) {!availableSectionTypes.P && '- N/A'}
                </SelectItem>
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
                <SelectValue placeholder={availableSections.length === 0 ? "No sections" : "Select"} />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {availableSections.map((s) => (
                  <SelectItem key={s.section} value={s.section}>
                    {s.section} ({s.room})
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
          <div className="mt-4 p-3 rounded-lg bg-secondary/30 flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedCourseCode}</span>: 
              {availableSectionTypes.L && <span className="text-primary ml-2">L✓</span>}
              {availableSectionTypes.T && <span className="text-warning ml-2">T✓</span>}
              {availableSectionTypes.P && <span className="text-grade-b ml-2">P✓</span>}
              {!availableSectionTypes.L && !availableSectionTypes.T && !availableSectionTypes.P && 
                <span className="text-destructive ml-2">No sections available</span>
              }
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
              const uniqueSections = new Map<string, { type: string; section: string }>();
              courseSections.forEach((s) => {
                const key = `${s.sectionType}:${s.section}`;
                if (!uniqueSections.has(key)) {
                  uniqueSections.set(key, { type: s.sectionType, section: s.section });
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
                      {Array.from(uniqueSections.values()).map(({ type, section }) => (
                        <span
                          key={`${type}-${section}`}
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            type === 'L' ? 'bg-primary/20 text-primary' :
                            type === 'T' ? 'bg-warning/20 text-warning' :
                            'bg-grade-b/20 text-grade-b'
                          }`}
                        >
                          {section}
                        </span>
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
