import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { A_SERIES_BRANCHES, B_SERIES_BRANCHES, A_SERIES_SEMESTERS, B_SERIES_SEMESTERS, UserProfile } from '@/types';
import { GraduationCap, Sparkles } from 'lucide-react';

interface BranchSelectorProps {
  onComplete: (profile: UserProfile) => void;
}

export function BranchSelector({ onComplete }: BranchSelectorProps) {
  const [primaryBranch, setPrimaryBranch] = useState('');
  const [dualBranch, setDualBranch] = useState('');
  const [semester, setSemester] = useState('');

  const isBSeries = B_SERIES_BRANCHES.includes(primaryBranch);
  const semesters = isBSeries ? B_SERIES_SEMESTERS : A_SERIES_SEMESTERS;

  const handleSubmit = () => {
    if (!primaryBranch || !semester) return;
    if (isBSeries && !dualBranch) return;

    onComplete({
      primaryBranch,
      dualBranch: isBSeries ? dualBranch : undefined,
      semester,
    });
  };

  const isValid = primaryBranch && semester && (!isBSeries || dualBranch);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <Card className="glass-card p-8 w-full max-w-md relative animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Welcome</h1>
          <p className="text-muted-foreground">Select your branch to get started</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Primary Branch</Label>
            <Select value={primaryBranch} onValueChange={(v) => {
              setPrimaryBranch(v);
              setDualBranch('');
              setSemester('');
            }}>
              <SelectTrigger className="bg-secondary/50 border-border/50 h-12">
                <SelectValue placeholder="Select your branch" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Single Degree (A Series)</div>
                {A_SERIES_BRANCHES.map((branch) => (
                  <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Dual Degree (B Series)</div>
                {B_SERIES_BRANCHES.map((branch) => (
                  <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isBSeries && (
            <div className="space-y-2 animate-slide-up">
              <Label className="text-sm font-medium">Dual Degree Branch</Label>
              <Select value={dualBranch} onValueChange={setDualBranch}>
                <SelectTrigger className="bg-secondary/50 border-border/50 h-12">
                  <SelectValue placeholder="Select dual degree branch" />
                </SelectTrigger>
                <SelectContent>
                  {A_SERIES_BRANCHES.map((branch) => (
                    <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Semester</Label>
            <Select value={semester} onValueChange={setSemester} disabled={!primaryBranch}>
              <SelectTrigger className="bg-secondary/50 border-border/50 h-12">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {semesters.map((sem) => (
                  <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/25"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get Started
          </Button>
        </div>
      </Card>
    </div>
  );
}
