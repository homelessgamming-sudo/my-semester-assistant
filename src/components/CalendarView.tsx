import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarEvent, ChronoData, SelectedSection } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, GraduationCap, BookOpen } from 'lucide-react';
import rawCourseData from '@/data/chronoscript-raw.json';

const courseData = rawCourseData as ChronoData;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface ExamEvent {
  id: string;
  courseCode: string;
  courseName: string;
  type: 'midsem' | 'compre';
  date: Date;
  endDate: Date;
  dateStr: string;
  timeStr: string;
}

// Parse ISO exam date
const parseExamTime = (isoString: string): { start: Date; end: Date } | null => {
  if (!isoString) return null;
  const [startStr, endStr] = isoString.split('|');
  if (!startStr || !endStr) return null;
  return { start: new Date(startStr), end: new Date(endStr) };
};

export function CalendarView() {
  const [events, setEvents] = useLocalStorage<CalendarEvent[]>('calendarEvents', []);
  const [selectedSections] = useLocalStorage<SelectedSection[]>('selectedSections', []);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');

  const years = Array.from({ length: 10 }, (_, i) => selectedYear - 5 + i);

  // Get unique course codes from selected sections
  const selectedCourseCodes = useMemo(() => 
    Array.from(new Set(selectedSections.map(s => s.courseCode))),
    [selectedSections]
  );

  // Get exam events from selected courses
  const examEvents = useMemo(() => {
    const exams: ExamEvent[] = [];
    
    selectedCourseCodes.forEach(code => {
      const course = courseData.courses[code];
      if (!course?.exams_iso?.[0]) return;
      
      const examData = course.exams_iso[0];
      
      // Midsem
      if (examData.midsem) {
        const parsed = parseExamTime(examData.midsem);
        if (parsed) {
          exams.push({
            id: `${code}-midsem`,
            courseCode: code,
            courseName: course.course_name,
            type: 'midsem',
            date: parsed.start,
            endDate: parsed.end,
            dateStr: `${parsed.start.getFullYear()}-${String(parsed.start.getMonth() + 1).padStart(2, '0')}-${String(parsed.start.getDate()).padStart(2, '0')}`,
            timeStr: `${parsed.start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${parsed.end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
          });
        }
      }
      
      // Compre
      if (examData.compre) {
        const parsed = parseExamTime(examData.compre);
        if (parsed) {
          exams.push({
            id: `${code}-compre`,
            courseCode: code,
            courseName: course.course_name,
            type: 'compre',
            date: parsed.start,
            endDate: parsed.end,
            dateStr: `${parsed.start.getFullYear()}-${String(parsed.start.getMonth() + 1).padStart(2, '0')}-${String(parsed.start.getDate()).padStart(2, '0')}`,
            timeStr: `${parsed.start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${parsed.end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
          });
        }
      }
    });
    
    return exams.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [selectedCourseCodes]);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);

  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const formatDate = (day: number) => {
    return `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getEventsForDate = (day: number) => {
    const dateStr = formatDate(day);
    return events.filter((e) => e.date === dateStr);
  };

  const getExamsForDate = (day: number) => {
    const dateStr = formatDate(day);
    return examEvents.filter((e) => e.dateStr === dateStr);
  };

  const addEvent = () => {
    if (!selectedDate || !newEventTitle.trim()) return;

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: newEventTitle.trim(),
      date: selectedDate,
      description: newEventDescription.trim() || undefined,
    };

    setEvents([...events, newEvent]);
    setNewEventTitle('');
    setNewEventDescription('');
    setShowAddEvent(false);
    setSelectedDate(null);
  };

  const removeEvent = (id: string) => {
    setEvents(events.filter((e) => e.id !== id));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      selectedMonth === today.getMonth() &&
      selectedYear === today.getFullYear()
    );
  };

  // Get upcoming exams
  const upcomingExams = useMemo(() => {
    const now = new Date();
    return examEvents.filter(e => e.date >= now).slice(0, 10);
  }, [examEvents]);

  return (
    <div className="space-y-6">
      {/* Upcoming Exams */}
      {upcomingExams.length > 0 && (
        <Card className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Upcoming Exams</h3>
            <span className="text-xs text-muted-foreground">({selectedCourseCodes.length} courses selected)</span>
          </div>
          <div className="space-y-3">
            {upcomingExams.map((exam) => (
              <div
                key={exam.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  exam.type === 'midsem' 
                    ? 'bg-warning/10 border-warning/30' 
                    : 'bg-destructive/10 border-destructive/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    exam.type === 'midsem' ? 'bg-warning/20' : 'bg-destructive/20'
                  }`}>
                    <BookOpen className={`w-4 h-4 ${
                      exam.type === 'midsem' ? 'text-warning' : 'text-destructive'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{exam.courseCode}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{exam.courseName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-semibold uppercase ${
                    exam.type === 'midsem' ? 'text-warning' : 'text-destructive'
                  }`}>
                    {exam.type}
                  </p>
                  <p className="text-sm font-medium">
                    {exam.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </p>
                  <p className="text-xs text-muted-foreground">{exam.timeStr}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {selectedCourseCodes.length === 0 && (
        <Card className="glass-card p-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <GraduationCap className="w-5 h-5" />
            <p className="text-sm">Add courses in the Timetable tab to see exam schedules here</p>
          </div>
        </Card>
      )}

      {/* Month/Year Selector */}
      <Card className="glass-card p-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-4">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-36 bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {MONTHS.map((month, index) => (
                  <SelectItem key={month} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-24 bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </Card>

      {/* Legend */}
      <Card className="glass-card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-warning/30 border border-warning/50" />
            <span className="text-sm text-muted-foreground">Midsem</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive/30 border border-destructive/50" />
            <span className="text-sm text-muted-foreground">Compre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary/30 border border-primary/50" />
            <span className="text-sm text-muted-foreground">Custom Event</span>
          </div>
        </div>
      </Card>

      {/* Calendar Grid */}
      <Card className="glass-card p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-semibold text-sm text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for days before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDate(day);
            const dayExams = getExamsForDate(day);
            const dateStr = formatDate(day);
            const hasMidsem = dayExams.some(e => e.type === 'midsem');
            const hasCompre = dayExams.some(e => e.type === 'compre');

            return (
              <div
                key={day}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setShowAddEvent(true);
                }}
                className={`aspect-square p-1 rounded-lg border cursor-pointer transition-all duration-200 hover:border-primary/50 ${
                  isToday(day)
                    ? 'bg-primary/20 border-primary/40'
                    : hasCompre
                    ? 'bg-destructive/10 border-destructive/30'
                    : hasMidsem
                    ? 'bg-warning/10 border-warning/30'
                    : 'bg-secondary/30 border-transparent'
                }`}
              >
                <div className="h-full flex flex-col">
                  <span className={`text-sm font-medium ${isToday(day) ? 'text-primary' : ''}`}>
                    {day}
                  </span>
                  <div className="flex-1 overflow-hidden space-y-0.5">
                    {/* Exams first */}
                    {dayExams.slice(0, 2).map((exam) => (
                      <div
                        key={exam.id}
                        className={`text-xs truncate px-1 py-0.5 rounded ${
                          exam.type === 'midsem'
                            ? 'bg-warning/30 text-warning'
                            : 'bg-destructive/30 text-destructive'
                        }`}
                      >
                        {exam.courseCode}
                      </div>
                    ))}
                    {/* Custom events */}
                    {dayExams.length < 2 && dayEvents.slice(0, 2 - dayExams.length).map((event) => (
                      <div
                        key={event.id}
                        className="text-xs truncate px-1 py-0.5 rounded bg-primary/30 text-primary"
                      >
                        {event.title}
                      </div>
                    ))}
                    {(dayEvents.length + dayExams.length) > 2 && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{dayEvents.length + dayExams.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Add Event Modal */}
      {showAddEvent && selectedDate && (
        <Card className="glass-card p-6 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowAddEvent(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Exams for this date */}
          {examEvents.filter((e) => e.dateStr === selectedDate).length > 0 && (
            <div className="mb-6 space-y-2">
              <Label className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Exams
              </Label>
              {examEvents
                .filter((e) => e.dateStr === selectedDate)
                .map((exam) => (
                  <div
                    key={exam.id}
                    className={`p-3 rounded-lg ${
                      exam.type === 'midsem'
                        ? 'bg-warning/20 border border-warning/30'
                        : 'bg-destructive/20 border border-destructive/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{exam.courseCode}</p>
                        <p className="text-sm text-muted-foreground">{exam.courseName}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-semibold uppercase ${
                          exam.type === 'midsem' ? 'text-warning' : 'text-destructive'
                        }`}>
                          {exam.type}
                        </p>
                        <p className="text-sm">{exam.timeStr}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Existing Custom Events */}
          {events.filter((e) => e.date === selectedDate).length > 0 && (
            <div className="mb-6 space-y-2">
              <Label>Custom Events</Label>
              {events
                .filter((e) => e.date === selectedDate)
                .map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium">{event.title}</p>
                      {event.description && (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEvent(event.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
            </div>
          )}

          {/* Add New Event */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Event Title</Label>
              <Input
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="Enter event title"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
                placeholder="Enter description"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <Button onClick={addEvent} disabled={!newEventTitle.trim()} className="w-full bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
