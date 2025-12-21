import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimetableEntry, AttendanceRecord, DAY_NAMES } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Check, X, Ban, RotateCcw, Calendar, Clock, MapPin } from 'lucide-react';

export function AttendanceTracker() {
  const [timetableData] = useLocalStorage<TimetableEntry[]>('timetableData', []);
  const [attendanceRecords, setAttendanceRecords] = useLocalStorage<AttendanceRecord[]>('attendanceRecords', []);

  const today = new Date();
  const dayIndex = today.getDay();
  const dayMap: Record<number, string> = {
    0: 'S', // Sunday
    1: 'M',
    2: 'T',
    3: 'W',
    4: 'Th',
    5: 'F',
    6: 'S',
  };
  const todayCode = dayMap[dayIndex];
  const todayString = today.toISOString().split('T')[0];

  const todaysClasses = useMemo(() => {
    return timetableData
      .filter((entry) => entry.days.includes(todayCode))
      .sort((a, b) => a.slots[0] - b.slots[0]);
  }, [timetableData, todayCode]);

  const getAttendanceStatus = (entry: TimetableEntry, slot: number): AttendanceRecord['status'] => {
    const record = attendanceRecords.find(
      (r) =>
        r.date === todayString &&
        r.courseCode === entry.courseCode &&
        r.section === entry.section &&
        r.timeRange === entry.timeRanges[entry.slots.indexOf(slot)]
    );
    return record?.status || null;
  };

  const setAttendance = (entry: TimetableEntry, slot: number, status: AttendanceRecord['status']) => {
    const timeRange = entry.timeRanges[entry.slots.indexOf(slot)];
    
    setAttendanceRecords((prev) => {
      const filtered = prev.filter(
        (r) =>
          !(r.date === todayString &&
            r.courseCode === entry.courseCode &&
            r.section === entry.section &&
            r.timeRange === timeRange)
      );
      
      if (status === null) {
        return filtered;
      }
      
      return [
        ...filtered,
        {
          date: todayString,
          courseCode: entry.courseCode,
          section: entry.section,
          status,
          timeRange,
        },
      ];
    });
  };

  const getStatusColor = (status: AttendanceRecord['status']) => {
    if (status === 'present') return 'bg-success/20 text-success border-success/40';
    if (status === 'absent') return 'bg-destructive/20 text-destructive border-destructive/40';
    if (status === 'cancelled') return 'bg-warning/20 text-warning border-warning/40';
    return 'bg-secondary/50 border-border/50';
  };

  const stats = useMemo(() => {
    const totalRecords = attendanceRecords.length;
    const present = attendanceRecords.filter((r) => r.status === 'present').length;
    const absent = attendanceRecords.filter((r) => r.status === 'absent').length;
    const cancelled = attendanceRecords.filter((r) => r.status === 'cancelled').length;
    const percentage = totalRecords > 0 ? ((present / (present + absent)) * 100) : 0;
    
    return { present, absent, cancelled, percentage };
  }, [attendanceRecords]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card p-4 text-center hover-lift">
          <p className="text-3xl font-bold text-success">{stats.present}</p>
          <p className="text-sm text-muted-foreground">Present</p>
        </Card>
        <Card className="glass-card p-4 text-center hover-lift">
          <p className="text-3xl font-bold text-destructive">{stats.absent}</p>
          <p className="text-sm text-muted-foreground">Absent</p>
        </Card>
        <Card className="glass-card p-4 text-center hover-lift">
          <p className="text-3xl font-bold text-warning">{stats.cancelled}</p>
          <p className="text-sm text-muted-foreground">Cancelled</p>
        </Card>
        <Card className="glass-card p-4 text-center hover-lift">
          <p className="text-3xl font-bold gradient-text">{stats.percentage.toFixed(1)}%</p>
          <p className="text-sm text-muted-foreground">Attendance</p>
        </Card>
      </div>

      {/* Today's Classes */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <Calendar className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold">Today's Classes</h3>
            <p className="text-sm text-muted-foreground">
              {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {todaysClasses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No classes scheduled for today</p>
            <p className="text-sm">Upload your timetable to see classes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todaysClasses.map((entry, index) =>
              entry.slots.map((slot, slotIndex) => {
                const status = getAttendanceStatus(entry, slot);
                const timeRange = entry.timeRanges[slotIndex];

                return (
                  <div
                    key={`${entry.courseCode}-${slot}-${index}`}
                    className={`p-4 rounded-xl border transition-all duration-200 ${getStatusColor(status)}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{entry.courseCode}</p>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm opacity-80">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {timeRange}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {entry.room}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-background/30 text-xs">
                            {entry.section}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={status === 'present' ? 'default' : 'outline'}
                          onClick={() => setAttendance(entry, slot, 'present')}
                          className={status === 'present' ? 'bg-success hover:bg-success/90' : ''}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={status === 'absent' ? 'default' : 'outline'}
                          onClick={() => setAttendance(entry, slot, 'absent')}
                          className={status === 'absent' ? 'bg-destructive hover:bg-destructive/90' : ''}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={status === 'cancelled' ? 'default' : 'outline'}
                          onClick={() => setAttendance(entry, slot, 'cancelled')}
                          className={status === 'cancelled' ? 'bg-warning hover:bg-warning/90' : ''}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                        {status && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setAttendance(entry, slot, null)}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
