import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Expense } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Plus, Trash2, Wallet, TrendingDown, Filter, DollarSign } from 'lucide-react';

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Education', 'Other'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function ExpenseTracker() {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('expenses', []);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());

  const years = useMemo(() => {
    const uniqueYears = new Set(expenses.map((e) => new Date(e.date).getFullYear()));
    uniqueYears.add(new Date().getFullYear());
    return Array.from(uniqueYears).sort((a, b) => b - a);
  }, [expenses]);

  const addExpense = () => {
    if (!title.trim() || !amount || !category) return;

    const expense: Expense = {
      id: Date.now().toString(),
      title: title.trim(),
      amount: parseFloat(amount),
      category,
      date: new Date().toISOString(),
    };

    setExpenses([expense, ...expenses]);
    setTitle('');
    setAmount('');
    setCategory('');
  };

  const deleteExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      const yearMatch = expenseDate.getFullYear().toString() === filterYear;
      const monthMatch = filterMonth === 'all' || expenseDate.getMonth().toString() === filterMonth;
      return yearMatch && monthMatch;
    });
  }, [expenses, filterMonth, filterYear]);

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      Food: 'bg-grade-a/20 text-grade-a',
      Transport: 'bg-grade-b/20 text-grade-b',
      Entertainment: 'bg-warning/20 text-warning',
      Shopping: 'bg-primary/20 text-primary',
      Bills: 'bg-destructive/20 text-destructive',
      Education: 'bg-grade-c/20 text-grade-c',
      Other: 'bg-muted text-muted-foreground',
    };
    return colors[cat] || colors.Other;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-3xl font-bold gradient-text">₹{totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/20">
              <TrendingDown className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-3xl font-bold">{filteredExpenses.length}</p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-grade-b/20">
              <DollarSign className="w-6 h-6 text-grade-b" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average</p>
              <p className="text-3xl font-bold">
                ₹{filteredExpenses.length > 0 ? (totalAmount / filteredExpenses.length).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Category Breakdown */}
      {categoryTotals.length > 0 && (
        <Card className="glass-card p-6">
          <h3 className="font-semibold mb-4">Category Breakdown</h3>
          <div className="space-y-3">
            {categoryTotals.map(([cat, total]) => (
              <div key={cat} className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm ${getCategoryColor(cat)}`}>
                  {cat}
                </span>
                <div className="flex-1 h-2 bg-secondary/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${(total / totalAmount) * 100}%` }}
                  />
                </div>
                <span className="font-medium">₹{total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add Expense */}
      <Card className="glass-card p-6">
        <h3 className="font-semibold mb-4">Add Expense</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Description"
            className="bg-secondary/50 border-border/50"
          />
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (₹)"
            className="bg-secondary/50 border-border/50"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-secondary/50 border-border/50">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={addExpense}
            disabled={!title.trim() || !amount || !category}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </Card>

      {/* Filter */}
      <Card className="glass-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter:</span>
          </div>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-32 bg-secondary/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {MONTHS.map((month, index) => (
                <SelectItem key={month} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-24 bg-secondary/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Expense List */}
      <Card className="glass-card p-6">
        <h3 className="font-semibold mb-4">Recent Expenses</h3>
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No expenses found</p>
            <p className="text-sm">Add an expense to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border/30 group"
              >
                <span className={`px-3 py-1 rounded-full text-xs ${getCategoryColor(expense.category)}`}>
                  {expense.category}
                </span>
                <div className="flex-1">
                  <p className="font-medium">{expense.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(expense.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span className="font-bold text-lg">₹{expense.amount.toFixed(2)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteExpense(expense.id)}
                  className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
