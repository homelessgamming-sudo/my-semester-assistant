import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/types';
import { CGPACalculator } from './CGPACalculator';
import { Timetable } from './Timetable';
import { TimetableGenerator } from './TimetableGenerator';
import { AttendanceTracker } from './AttendanceTracker';
import { CalendarView } from './CalendarView';
import { TodoList } from './TodoList';
import { ExpenseTracker } from './ExpenseTracker';
import {
  Calculator,
  Calendar,
  Clock,
  CheckSquare,
  ListTodo,
  Wallet,
  LogOut,
  GraduationCap,
  Menu,
  X,
  Wand2,
} from 'lucide-react';

type TabId = 'cgpa' | 'timetable' | 'generator' | 'attendance' | 'calendar' | 'todo' | 'expenses';

interface DashboardProps {
  profile: UserProfile;
  onLogout: () => void;
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'cgpa', label: 'CGPA', icon: Calculator },
  { id: 'generator', label: 'Generator', icon: Wand2 },
  { id: 'timetable', label: 'Timetable', icon: Clock },
  { id: 'attendance', label: 'Attendance', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'todo', label: 'Todo', icon: ListTodo },
  { id: 'expenses', label: 'Expenses', icon: Wallet },
];

export function Dashboard({ profile, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('generator');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'cgpa':
        return <CGPACalculator />;
      case 'generator':
        return <TimetableGenerator />;
      case 'timetable':
        return <Timetable />;
      case 'attendance':
        return <AttendanceTracker />;
      case 'calendar':
        return <CalendarView />;
      case 'todo':
        return <TodoList />;
      case 'expenses':
        return <ExpenseTracker />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-primary/20">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-lg gradient-text">Academic Hub</h1>
                <p className="text-xs text-muted-foreground">
                  {profile.primaryBranch}
                  {profile.dualBranch && ` + ${profile.dualBranch}`} • {profile.semester}
                </p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden xl:flex items-center gap-1">
              {TABS.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className={activeTab === tab.id ? 'bg-primary' : ''}
                >
                  <tab.icon className="w-4 h-4 mr-1" />
                  {tab.label}
                </Button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground">
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="xl:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <nav className="xl:hidden mt-4 pb-2 grid grid-cols-2 gap-2 animate-slide-up">
              {TABS.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`justify-start ${activeTab === tab.id ? 'bg-primary' : ''}`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </Button>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="animate-fade-in">{renderTabContent()}</div>
      </main>
    </div>
  );
}
