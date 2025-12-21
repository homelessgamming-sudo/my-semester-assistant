import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CourseData, TimetableEntry, SLOT_MAP, DAYS, DAY_NAMES } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Clock, Calendar, Plus, Trash2, Search } from 'lucide-react';
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

interface TimetableProps {
  onEntriesChange?: (entries: TimetableEntry[]) => void;
}

export function Timetable({ onEntriesChange }: TimetableProps) {
  const data = courseData as CourseData;
  const [selectedSections, setSelectedSections] = useLocalStorage<SelectedSection[]>('selectedSections', []);
  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [selectedSectionType, setSelectedSectionType] = useState<'L' | 'T' | 'P'>('L');
  const [selectedSectionName, setSelectedSectionName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCourse = selectedCourseCode ? data.courses[selectedCourseCode] : null;

  const availableSections = useMemo(() => {
    if (!selectedCourse) return [];
    const sections = selectedCourse.sections[selectedSectionType];
    // Group sections by section name
    const uniqueSections = new Map<string, typeof sections[0]>();
    sections.forEach((s) => {
      if (!uniqueSections.has(s.section)) {
        uniqueSections.set(s.section, s);
      }
    });
    return Array.from(uniqueSections.values());
  }, [selectedCourse, selectedSectionType]);

  const filteredCourses = useMemo(() => {
    return Object.entries(data.courses)
      .filter(([code, course]) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return code.toLowerCase().includes(query) || course.title.toLowerCase().includes(query);
      })
      .slice(0, 50);
  }, [data.courses, searchQuery]);

  const addSection = () => {
    if (!selectedCourseCode || !selectedSectionName || !selectedCourse) return;

    const allSectionsOfType = selectedCourse.sections[selectedSectionType].filter(
      (s) => s.section === selectedSectionName
    );

    const newSections: SelectedSection[] = allSectionsOfType.map((s) => ({
      courseCode: selectedCourseCode,
      courseTitle: selectedCourse.title,
      sectionType: selectedSectionType,
      section: s.section,
      room: s.room,
      days: s.days,
      slots: s.slots.filter((slot) => slot <= 11),
      timeRanges: s.timeRanges.filter((t) => !t.startsWith('UNKNOWN')),
    }));

    const updated = [...selectedSections, ...newSections];
    setSelectedSections(updated);
    onEntriesChange?.(updated);
    setSelectedCourseCode('');
    setSelectedSectionType('L');
    setSelectedSectionName('');
  };

  const removeSection = (courseCode: string, sectionType: string, section: string) => {
    const updated = selectedSections.filter(
      (s) => !(s.courseCode === courseCode && s.sectionType === sectionType && s.section === section)
    );
    setSelectedSections(updated);
    onEntriesChange?.(updated);
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
          if (grid[day] && slot <= 11) {
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
            placeholder="Search courses..."
            className="pl-10 bg-secondary/50 border-border/50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Select value={selectedCourseCode} onValueChange={(v) => {
            setSelectedCourseCode(v);
            setSelectedSectionName('');
          }}>
            <SelectTrigger className="bg-secondary/50 border-border/50">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {filteredCourses.map(([code, course]) => (
                <SelectItem key={code} value={code}>
                  {code} - {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
            <SelectContent>
              <SelectItem value="L">Lecture (L)</SelectItem>
              <SelectItem value="T">Tutorial (T)</SelectItem>
              <SelectItem value="P">Practical (P)</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={selectedSectionName} 
            onValueChange={setSelectedSectionName}
            disabled={!selectedCourseCode || availableSections.length === 0}
          >
            <SelectTrigger className="bg-secondary/50 border-border/50">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              {availableSections.map((s) => (
                <SelectItem key={s.section} value={s.section}>
                  {s.section} - {s.room}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={addSection}
            disabled={!selectedCourseCode || !selectedSectionName}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
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
              <>
                <div
                  key={`time-${slot}`}
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
                      className={`p-3 rounded-lg border transition-all duration-200 ${
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
              </>
            ))}
          </div>
        </div>
      </Card>

      {/* Selected Sections List */}
      {selectedSections.length > 0 && (
        <Card className="glass-card p-6">
          <h3 className="font-semibold mb-4">Selected Sections</h3>
          <div className="space-y-3">
            {/* Group by course */}
            {Array.from(new Set(selectedSections.map((s) => s.courseCode))).map((courseCode) => {
              const sections = selectedSections.filter((s) => s.courseCode === courseCode);
              const first = sections[0];
              return (
                <div
                  key={courseCode}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border/30"
                >
                  <div className="flex-1">
                    <p className="font-medium">{courseCode}</p>
                    <p className="text-sm text-muted-foreground">{first.courseTitle}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Array.from(new Set(sections.map((s) => `${s.sectionType}:${s.section}`))).map((key) => {
                        const [type, section] = key.split(':');
                        return (
                          <span
                            key={key}
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              type === 'L' ? 'bg-primary/20 text-primary' :
                              type === 'T' ? 'bg-warning/20 text-warning' :
                              'bg-grade-b/20 text-grade-b'
                            }`}
                          >
                            {section}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const updated = selectedSections.filter((s) => s.courseCode !== courseCode);
                      setSelectedSections(updated);
                    }}
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
