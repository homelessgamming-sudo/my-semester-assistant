import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimetableEntry, TIME_SLOTS, DAYS, DAY_NAMES } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Upload, Clock, Calendar } from 'lucide-react';

interface TimetableProps {
  onEntriesChange?: (entries: TimetableEntry[]) => void;
}

export function Timetable({ onEntriesChange }: TimetableProps) {
  const [timetableData, setTimetableData] = useLocalStorage<TimetableEntry[]>('timetableData', []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const entries = Array.isArray(data) ? data : data.entries || [];
          setTimetableData(entries);
          onEntriesChange?.(entries);
        } catch (error) {
          console.error('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  const timetableGrid = useMemo(() => {
    const grid: Record<string, Record<number, TimetableEntry | null>> = {};
    
    DAYS.forEach((day) => {
      grid[day] = {};
      Object.keys(TIME_SLOTS).forEach((slot) => {
        grid[day][Number(slot)] = null;
      });
    });

    timetableData.forEach((entry) => {
      entry.days.forEach((day) => {
        entry.slots.forEach((slot) => {
          if (grid[day]) {
            grid[day][slot] = entry;
          }
        });
      });
    });

    return grid;
  }, [timetableData]);

  const getSlotColor = (entry: TimetableEntry | null) => {
    if (!entry) return '';
    const section = entry.section.charAt(0);
    if (section === 'L') return 'bg-primary/20 border-primary/40 text-primary';
    if (section === 'T') return 'bg-warning/20 border-warning/40 text-warning';
    if (section === 'P') return 'bg-grade-b/20 border-grade-b/40 text-grade-b';
    return 'bg-accent/50 border-accent text-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <Upload className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Timetable Data</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="timetable-upload" className="sr-only">Upload Timetable JSON</Label>
            <Input
              id="timetable-upload"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="bg-secondary/50 border-border/50 file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-4 file:py-2 file:mr-4 file:cursor-pointer"
            />
          </div>
          {timetableData.length > 0 && (
            <p className="text-sm text-muted-foreground self-center">
              {timetableData.length} entries loaded
            </p>
          )}
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
            {Object.entries(TIME_SLOTS).map(([slot, time]) => (
              <>
                <div
                  key={`time-${slot}`}
                  className="flex items-center justify-center p-3 rounded-lg bg-secondary/30 text-sm text-muted-foreground"
                >
                  {time}
                </div>
                {DAYS.map((day) => {
                  const entry = timetableGrid[day][Number(slot)];
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
    </div>
  );
}
