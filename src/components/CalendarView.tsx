import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarEvent } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function CalendarView() {
  const [events, setEvents] = useLocalStorage<CalendarEvent[]>('calendarEvents', []);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');

  const years = Array.from({ length: 10 }, (_, i) => selectedYear - 5 + i);

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

  return (
    <div className="space-y-6">
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
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={month} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))
                }
              </SelectContent>
            </Select>

            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-24 bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))
                }
              </SelectContent>
            </Select>
          </div>

          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
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
          ))
          }
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for days before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))
          }

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDate(day);
            const dateStr = formatDate(day);

            return (
              <div
                key={day}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setShowAddEvent(true);
                }}
                className={`aspect-square p-1 rounded-lg border cursor-pointer transition-all duration-200 hover:border-primary/50 ${isToday(day)
                  ? 'bg-primary/20 border-primary/40'
                  : 'bg-secondary/30 border-transparent'
                  }`}
              >
                <div className="h-full flex flex-col">
                  <span className={`text-sm font-medium ${isToday(day) ? 'text-primary' : ''}`}>
                    {day}
                  </span>
                  <div className="flex-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="text-xs truncate px-1 py-0.5 rounded bg-primary/30 text-primary-foreground mb-0.5"
                      >
                        {event.title}
                      </div>
                    ))
                    }
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
          }
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

          {/* Existing Events */}
          {events.filter((e) => e.date === selectedDate).length > 0 && (
            <div className="mb-6 space-y-2">
              <Label>Events</Label>
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
                ))
              }
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
