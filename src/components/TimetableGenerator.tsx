import { useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ChronoData, SelectedSection, SLOT_MAP, DAYS, DAY_NAMES } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { 
  Wand2, Plus, Trash2, Search, AlertTriangle, Clock, Calendar, 
  Settings2, ChevronLeft, ChevronRight, Check, X, User
} from 'lucide-react';
import rawCourseData from '@/data/chronoscript-raw.json';

const courseData = rawCourseData as ChronoData;

interface CourseSelection {
  courseCode: string;
  courseName: string;
  credits: number;
  requiredSections: ('L' | 'T' | 'P')[];
}

interface GeneratorConstraints {
  maxHoursPerDay: number;
  avoidBackToBack: boolean;
  avoidSlots: { day: string; slot: number }[];
  avoidLabDays: string[];
  avoidLabSlots: number[];
  avoidInstructors: string[];
}

interface GeneratedTimetable {
  sections: SelectedSection[];
  score: number;
  hoursPerDay: Record<string, number>;
}

export function TimetableGenerator() {
  const [, setSelectedSections] = useLocalStorage<SelectedSection[]>('selectedSections', []);
  const [selectedCourses, setSelectedCourses] = useState<CourseSelection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [generatedTimetables, setGeneratedTimetables] = useState<GeneratedTimetable[]>([]);
  const [currentTimetableIndex, setCurrentTimetableIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConstraints, setShowConstraints] = useState(false);

  const [constraints, setConstraints] = useState<GeneratorConstraints>({
    maxHoursPerDay: 8,
    avoidBackToBack: false,
    avoidSlots: [],
    avoidLabDays: [],
    avoidLabSlots: [],
    avoidInstructors: [],
  });

  const [newAvoidInstructor, setNewAvoidInstructor] = useState('');

  // Get all unique instructors from course data
  const allInstructors = useMemo(() => {
    const instructors = new Set<string>();
    Object.values(courseData.courses).forEach((course) => {
      Object.values(course.sections).forEach((section) => {
        section.instructor.forEach((i) => instructors.add(i));
      });
    });
    return Array.from(instructors).sort();
  }, []);

  const filteredCourses = useMemo(() => {
    return Object.entries(courseData.courses)
      .filter(([code, course]) => {
        if (Object.keys(course.sections).length === 0) return false;
        if (selectedCourses.find((c) => c.courseCode === code)) return false;
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return code.toLowerCase().includes(query) || course.course_name.toLowerCase().includes(query);
      })
      .slice(0, 50);
  }, [searchQuery, selectedCourses]);

  const addCourse = () => {
    if (!selectedCourseCode) return;
    const course = courseData.courses[selectedCourseCode];
    if (!course) return;

    // Determine required section types
    const hasL = Object.keys(course.sections).some((s) => s.startsWith('L'));
    const hasT = Object.keys(course.sections).some((s) => s.startsWith('T'));
    const hasP = Object.keys(course.sections).some((s) => s.startsWith('P'));

    const requiredSections: ('L' | 'T' | 'P')[] = [];
    if (hasL) requiredSections.push('L');
    if (hasT) requiredSections.push('T');
    if (hasP) requiredSections.push('P');

    setSelectedCourses([
      ...selectedCourses,
      {
        courseCode: selectedCourseCode,
        courseName: course.course_name,
        credits: course.units,
        requiredSections,
      },
    ]);
    setSelectedCourseCode('');
    setSearchQuery('');
    setGeneratedTimetables([]);
  };

  const removeCourse = (courseCode: string) => {
    setSelectedCourses(selectedCourses.filter((c) => c.courseCode !== courseCode));
    setGeneratedTimetables([]);
  };

  const toggleSlotAvoidance = (day: string, slot: number) => {
    setConstraints((prev) => {
      const exists = prev.avoidSlots.find((s) => s.day === day && s.slot === slot);
      if (exists) {
        return {
          ...prev,
          avoidSlots: prev.avoidSlots.filter((s) => !(s.day === day && s.slot === slot)),
        };
      }
      return {
        ...prev,
        avoidSlots: [...prev.avoidSlots, { day, slot }],
      };
    });
  };

  const toggleLabDay = (day: string) => {
    setConstraints((prev) => {
      if (prev.avoidLabDays.includes(day)) {
        return { ...prev, avoidLabDays: prev.avoidLabDays.filter((d) => d !== day) };
      }
      return { ...prev, avoidLabDays: [...prev.avoidLabDays, day] };
    });
  };

  const toggleLabSlot = (slot: number) => {
    setConstraints((prev) => {
      if (prev.avoidLabSlots.includes(slot)) {
        return { ...prev, avoidLabSlots: prev.avoidLabSlots.filter((s) => s !== slot) };
      }
      return { ...prev, avoidLabSlots: [...prev.avoidLabSlots, slot] };
    });
  };

  const addAvoidInstructor = () => {
    if (!newAvoidInstructor.trim()) return;
    setConstraints((prev) => ({
      ...prev,
      avoidInstructors: [...prev.avoidInstructors, newAvoidInstructor.trim()],
    }));
    setNewAvoidInstructor('');
  };

  const removeAvoidInstructor = (instructor: string) => {
    setConstraints((prev) => ({
      ...prev,
      avoidInstructors: prev.avoidInstructors.filter((i) => i !== instructor),
    }));
  };

  // Check if two sections clash
  const sectionsClash = useCallback((s1: SelectedSection, s2: SelectedSection): boolean => {
    for (const day of s1.days) {
      if (s2.days.includes(day)) {
        for (const slot of s1.slots) {
          if (s2.slots.includes(slot)) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  // Check if sections are back-to-back
  const areBackToBack = useCallback((s1: SelectedSection, s2: SelectedSection): boolean => {
    for (const day of s1.days) {
      if (s2.days.includes(day)) {
        for (const slot1 of s1.slots) {
          for (const slot2 of s2.slots) {
            if (Math.abs(slot1 - slot2) === 1) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }, []);

  // Validate a combination against constraints
  const validateCombination = useCallback((sections: SelectedSection[]): { valid: boolean; score: number; hoursPerDay: Record<string, number> } => {
    // Check for clashes
    for (let i = 0; i < sections.length; i++) {
      for (let j = i + 1; j < sections.length; j++) {
        if (sectionsClash(sections[i], sections[j])) {
          return { valid: false, score: 0, hoursPerDay: {} };
        }
      }
    }

    // Calculate hours per day
    const hoursPerDay: Record<string, number> = {};
    DAYS.forEach((day) => (hoursPerDay[day] = 0));

    sections.forEach((section) => {
      section.days.forEach((day) => {
        hoursPerDay[day] += section.slots.length;
      });
    });

    // Check max hours per day
    for (const day of DAYS) {
      if (hoursPerDay[day] > constraints.maxHoursPerDay) {
        return { valid: false, score: 0, hoursPerDay };
      }
    }

    // Check avoided slots
    for (const section of sections) {
      for (const day of section.days) {
        for (const slot of section.slots) {
          if (constraints.avoidSlots.find((s) => s.day === day && s.slot === slot)) {
            return { valid: false, score: 0, hoursPerDay };
          }
        }
      }
    }

    // Check avoided lab days and slots
    for (const section of sections) {
      if (section.sectionType === 'P') {
        for (const day of section.days) {
          if (constraints.avoidLabDays.includes(day)) {
            return { valid: false, score: 0, hoursPerDay };
          }
        }
        for (const slot of section.slots) {
          if (constraints.avoidLabSlots.includes(slot)) {
            return { valid: false, score: 0, hoursPerDay };
          }
        }
      }
    }

    // Check avoided instructors
    for (const section of sections) {
      for (const instructor of section.instructor) {
        if (constraints.avoidInstructors.some((ai) => 
          instructor.toLowerCase().includes(ai.toLowerCase())
        )) {
          return { valid: false, score: 0, hoursPerDay };
        }
      }
    }

    // Calculate score (higher is better)
    let score = 100;

    // Penalize back-to-back classes
    if (constraints.avoidBackToBack) {
      for (let i = 0; i < sections.length; i++) {
        for (let j = i + 1; j < sections.length; j++) {
          if (areBackToBack(sections[i], sections[j])) {
            score -= 10;
          }
        }
      }
    }

    // Prefer balanced days
    const dayValues = Object.values(hoursPerDay);
    const avgHours = dayValues.reduce((a, b) => a + b, 0) / dayValues.length;
    const variance = dayValues.reduce((sum, h) => sum + Math.pow(h - avgHours, 2), 0) / dayValues.length;
    score -= variance * 2;

    // Prefer free days (days with 0 hours)
    score += dayValues.filter((h) => h === 0).length * 5;

    return { valid: true, score, hoursPerDay };
  }, [constraints, sectionsClash, areBackToBack]);

  // Generate all valid timetables
  const generateTimetables = useCallback(() => {
    setIsGenerating(true);
    setGeneratedTimetables([]);

    // Build section options for each course
    const courseOptions: { courseCode: string; sectionType: 'L' | 'T' | 'P'; options: SelectedSection[] }[][] = [];

    for (const course of selectedCourses) {
      const courseSections = courseData.courses[course.courseCode].sections;
      const courseOptionGroups: { courseCode: string; sectionType: 'L' | 'T' | 'P'; options: SelectedSection[] }[] = [];

      for (const sectionType of course.requiredSections) {
        const sectionOptions: SelectedSection[] = [];
        
        for (const [sectionName, sectionData] of Object.entries(courseSections)) {
          if (!sectionName.startsWith(sectionType)) continue;

          // Create section entries for each schedule
          for (const schedule of sectionData.schedule) {
            sectionOptions.push({
              courseCode: course.courseCode,
              courseTitle: course.courseName,
              sectionType,
              section: sectionName,
              instructor: sectionData.instructor,
              room: schedule.room,
              days: schedule.days,
              slots: schedule.hours.filter((h) => h >= 1 && h <= 11),
            });
          }
        }

        if (sectionOptions.length > 0) {
          // Group by section name (L1, T1, etc.)
          const groupedByName: Record<string, SelectedSection[]> = {};
          sectionOptions.forEach((opt) => {
            if (!groupedByName[opt.section]) groupedByName[opt.section] = [];
            groupedByName[opt.section].push(opt);
          });

          // Each section name is one option (with all its schedules)
          const options = Object.entries(groupedByName).map(([name, schedules]) => ({
            courseCode: course.courseCode,
            sectionType,
            section: name,
            schedules,
          }));

          courseOptionGroups.push({
            courseCode: course.courseCode,
            sectionType,
            options: options.map((o) => o.schedules).flat(),
          });
        }
      }

      if (courseOptionGroups.length > 0) {
        courseOptions.push(courseOptionGroups);
      }
    }

    // Generate combinations
    const validTimetables: GeneratedTimetable[] = [];
    const maxTimetables = 100;

    const generateCombinations = (
      index: number,
      currentSections: SelectedSection[],
      currentSectionNames: Set<string>
    ) => {
      if (validTimetables.length >= maxTimetables) return;

      if (index >= courseOptions.length) {
        const result = validateCombination(currentSections);
        if (result.valid) {
          validTimetables.push({
            sections: [...currentSections],
            score: result.score,
            hoursPerDay: result.hoursPerDay,
          });
        }
        return;
      }

      const courseGroups = courseOptions[index];
      
      // For each required section type of this course
      const generateForSectionTypes = (
        typeIndex: number,
        typeSections: SelectedSection[],
        typeNames: Set<string>
      ) => {
        if (validTimetables.length >= maxTimetables) return;

        if (typeIndex >= courseGroups.length) {
          generateCombinations(index + 1, typeSections, typeNames);
          return;
        }

        const group = courseGroups[typeIndex];
        
        // Get unique section names
        const uniqueNames = new Set(group.options.map((o) => o.section));
        
        for (const sectionName of uniqueNames) {
          if (validTimetables.length >= maxTimetables) return;
          
          const sectionSchedules = group.options.filter((o) => o.section === sectionName);
          const newSections = [...typeSections, ...sectionSchedules];
          const newNames = new Set(typeNames);
          newNames.add(`${group.courseCode}-${sectionName}`);
          
          generateForSectionTypes(typeIndex + 1, newSections, newNames);
        }
      };

      generateForSectionTypes(0, currentSections, currentSectionNames);
    };

    // Use setTimeout to not block UI
    setTimeout(() => {
      generateCombinations(0, [], new Set());
      
      // Sort by score
      validTimetables.sort((a, b) => b.score - a.score);
      
      setGeneratedTimetables(validTimetables);
      setCurrentTimetableIndex(0);
      setIsGenerating(false);
    }, 100);
  }, [selectedCourses, validateCombination]);

  const applyTimetable = () => {
    if (generatedTimetables.length === 0) return;
    const timetable = generatedTimetables[currentTimetableIndex];
    setSelectedSections(timetable.sections);
  };

  const currentTimetable = generatedTimetables[currentTimetableIndex];

  // Build grid for current timetable preview
  const timetableGrid = useMemo(() => {
    if (!currentTimetable) return null;

    const grid: Record<string, Record<number, SelectedSection | null>> = {};
    DAYS.forEach((day) => {
      grid[day] = {};
      for (let slot = 1; slot <= 11; slot++) {
        grid[day][slot] = null;
      }
    });

    currentTimetable.sections.forEach((entry) => {
      entry.days.forEach((day) => {
        entry.slots.forEach((slot) => {
          if (grid[day] && slot >= 1 && slot <= 11) {
            grid[day][slot] = entry;
          }
        });
      });
    });

    return grid;
  }, [currentTimetable]);

  const getSlotColor = (entry: SelectedSection | null) => {
    if (!entry) return '';
    if (entry.sectionType === 'L') return 'bg-primary/20 border-primary/40 text-primary';
    if (entry.sectionType === 'T') return 'bg-warning/20 border-warning/40 text-warning';
    if (entry.sectionType === 'P') return 'bg-grade-b/20 border-grade-b/40 text-grade-b';
    return 'bg-accent/50 border-accent text-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <Wand2 className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Timetable Generator</h2>
            <p className="text-sm text-muted-foreground">
              Select courses and constraints to generate optimal timetables
            </p>
          </div>
        </div>

        {/* Course Search & Add */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses..."
              className="pl-10 bg-secondary/50 border-border/50"
            />
          </div>

          <div className="flex gap-4">
            <Select value={selectedCourseCode} onValueChange={setSelectedCourseCode}>
              <SelectTrigger className="flex-1 bg-secondary/50 border-border/50">
                <SelectValue placeholder="Select course to add" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] bg-popover">
                {filteredCourses.map(([code, course]) => (
                  <SelectItem key={code} value={code}>
                    {code} - {course.course_name} ({course.units} cr)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addCourse} disabled={!selectedCourseCode} className="bg-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      </Card>

      {/* Selected Courses */}
      {selectedCourses.length > 0 && (
        <Card className="glass-card p-6">
          <h3 className="font-semibold mb-4">Selected Courses ({selectedCourses.length})</h3>
          <div className="space-y-2">
            {selectedCourses.map((course) => (
              <div
                key={course.courseCode}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <div>
                  <span className="font-medium">{course.courseCode}</span>
                  <span className="text-muted-foreground ml-2">{course.courseName}</span>
                  <div className="flex gap-1 mt-1">
                    {course.requiredSections.map((type) => (
                      <span
                        key={type}
                        className={`px-2 py-0.5 rounded text-xs ${
                          type === 'L' ? 'bg-primary/20 text-primary' :
                          type === 'T' ? 'bg-warning/20 text-warning' :
                          'bg-grade-b/20 text-grade-b'
                        }`}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCourse(course.courseCode)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Constraints */}
      <Card className="glass-card p-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowConstraints(!showConstraints)}
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Constraints</h3>
          </div>
          <ChevronRight className={`w-5 h-5 transition-transform ${showConstraints ? 'rotate-90' : ''}`} />
        </div>

        {showConstraints && (
          <div className="mt-4 space-y-6">
            {/* Max Hours Per Day */}
            <div className="space-y-2">
              <Label>Max hours per day</Label>
              <Input
                type="number"
                min={1}
                max={11}
                value={constraints.maxHoursPerDay}
                onChange={(e) => setConstraints({ ...constraints, maxHoursPerDay: Number(e.target.value) })}
                className="w-32 bg-secondary/50"
              />
            </div>

            {/* Avoid Back-to-Back */}
            <div className="flex items-center gap-3">
              <Switch
                checked={constraints.avoidBackToBack}
                onCheckedChange={(checked) => setConstraints({ ...constraints, avoidBackToBack: checked })}
              />
              <Label>Avoid back-to-back classes</Label>
            </div>

            {/* Avoid Time Slots */}
            <div className="space-y-2">
              <Label>Avoid time slots (click to toggle)</Label>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-[80px_repeat(6,1fr)] gap-1 min-w-[600px]">
                  <div />
                  {DAYS.map((day) => (
                    <div key={day} className="text-center text-sm font-medium py-1">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: 11 }, (_, i) => i + 1).map((slot) => (
                    <div key={`row-${slot}`} className="contents">
                      <div className="text-xs text-muted-foreground py-1">{SLOT_MAP[slot]}</div>
                      {DAYS.map((day) => {
                        const isAvoided = constraints.avoidSlots.some(
                          (s) => s.day === day && s.slot === slot
                        );
                        return (
                          <button
                            key={`${day}-${slot}`}
                            onClick={() => toggleSlotAvoidance(day, slot)}
                            className={`h-6 rounded border transition-colors ${
                              isAvoided
                                ? 'bg-destructive/30 border-destructive/50'
                                : 'bg-secondary/30 border-transparent hover:border-border'
                            }`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Avoid Labs on Days */}
            <div className="space-y-2">
              <Label>Avoid labs on days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleLabDay(day)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      constraints.avoidLabDays.includes(day)
                        ? 'bg-destructive/30 text-destructive'
                        : 'bg-secondary/50 hover:bg-secondary'
                    }`}
                  >
                    {DAY_NAMES[day]}
                  </button>
                ))}
              </div>
            </div>

            {/* Avoid Labs at Slots */}
            <div className="space-y-2">
              <Label>Avoid labs at times</Label>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 11 }, (_, i) => i + 1).map((slot) => (
                  <button
                    key={slot}
                    onClick={() => toggleLabSlot(slot)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      constraints.avoidLabSlots.includes(slot)
                        ? 'bg-destructive/30 text-destructive'
                        : 'bg-secondary/50 hover:bg-secondary'
                    }`}
                  >
                    {SLOT_MAP[slot]}
                  </button>
                ))}
              </div>
            </div>

            {/* Avoid Instructors */}
            <div className="space-y-2">
              <Label>Avoid instructors</Label>
              <div className="flex gap-2">
                <Select value={newAvoidInstructor} onValueChange={setNewAvoidInstructor}>
                  <SelectTrigger className="flex-1 bg-secondary/50">
                    <SelectValue placeholder="Select instructor" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] bg-popover">
                    {allInstructors
                      .filter((i) => !constraints.avoidInstructors.includes(i))
                      .map((instructor) => (
                        <SelectItem key={instructor} value={instructor}>
                          {instructor}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={addAvoidInstructor} disabled={!newAvoidInstructor} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {constraints.avoidInstructors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {constraints.avoidInstructors.map((instructor) => (
                    <span
                      key={instructor}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/20 text-sm"
                    >
                      <User className="w-3 h-3" />
                      {instructor}
                      <button onClick={() => removeAvoidInstructor(instructor)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Generate Button */}
      <Button
        onClick={generateTimetables}
        disabled={selectedCourses.length === 0 || isGenerating}
        className="w-full h-12 bg-primary hover:bg-primary/90 text-lg"
      >
        {isGenerating ? (
          <>Generating...</>
        ) : (
          <>
            <Wand2 className="w-5 h-5 mr-2" />
            Generate Timetables
          </>
        )}
      </Button>

      {/* Results */}
      {generatedTimetables.length > 0 && (
        <Card className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">
              Generated Timetables ({generatedTimetables.length})
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentTimetableIndex(Math.max(0, currentTimetableIndex - 1))}
                disabled={currentTimetableIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                {currentTimetableIndex + 1} / {generatedTimetables.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentTimetableIndex(Math.min(generatedTimetables.length - 1, currentTimetableIndex + 1))}
                disabled={currentTimetableIndex === generatedTimetables.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Hours per day summary */}
          {currentTimetable && (
            <div className="flex flex-wrap gap-2 mb-4">
              {DAYS.map((day) => (
                <span
                  key={day}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    currentTimetable.hoursPerDay[day] === 0
                      ? 'bg-success/20 text-success'
                      : currentTimetable.hoursPerDay[day] > 6
                      ? 'bg-warning/20 text-warning'
                      : 'bg-secondary/50'
                  }`}
                >
                  {DAY_NAMES[day]}: {currentTimetable.hoursPerDay[day]}h
                </span>
              ))}
            </div>
          )}

          {/* Timetable Preview */}
          {timetableGrid && (
            <div className="overflow-x-auto mb-4">
              <div className="min-w-[700px]">
                <div className="grid grid-cols-[80px_repeat(6,1fr)] gap-1">
                  <div className="flex items-center justify-center p-2 rounded bg-secondary/50 font-semibold">
                    <Clock className="w-4 h-4" />
                  </div>
                  {DAYS.map((day) => (
                    <div key={day} className="p-2 rounded bg-secondary/50 font-semibold text-center text-sm">
                      {DAY_NAMES[day]}
                    </div>
                  ))}
                  {Array.from({ length: 11 }, (_, i) => i + 1).map((slot) => (
                    <div key={`row-${slot}`} className="contents">
                      <div className="flex items-center justify-center p-2 rounded bg-secondary/30 text-xs text-muted-foreground">
                        {SLOT_MAP[slot]}
                      </div>
                      {DAYS.map((day) => {
                        const entry = timetableGrid[day][slot];
                        const colorClass = getSlotColor(entry);
                        return (
                          <div
                            key={`${day}-${slot}`}
                            className={`p-2 rounded border min-h-[50px] ${
                              entry ? colorClass : 'bg-secondary/20 border-transparent'
                            }`}
                          >
                            {entry && (
                              <div className="text-center">
                                <p className="font-medium text-xs">{entry.courseCode}</p>
                                <p className="text-[10px] opacity-70">{entry.section}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Button onClick={applyTimetable} className="w-full bg-success hover:bg-success/90">
            <Check className="w-4 h-4 mr-2" />
            Apply This Timetable
          </Button>
        </Card>
      )}

      {generatedTimetables.length === 0 && selectedCourses.length > 0 && !isGenerating && (
        <Card className="glass-card p-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-warning" />
          <p className="text-muted-foreground">
            No valid timetables generated yet. Click "Generate Timetables" to find combinations.
          </p>
        </Card>
      )}
    </div>
  );
}
