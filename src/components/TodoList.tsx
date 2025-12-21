import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { TodoItem } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Plus, Trash2, CheckCircle2, Circle, ListTodo } from 'lucide-react';

export function TodoList() {
  const [todos, setTodos] = useLocalStorage<TodoItem[]>('todoItems', []);
  const [newTodo, setNewTodo] = useState('');

  const addTodo = () => {
    if (!newTodo.trim()) return;

    const todo: TodoItem = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setTodos([todo, ...todos]);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const activeTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="glass-card p-4 text-center hover-lift">
          <p className="text-3xl font-bold gradient-text">{todos.length}</p>
          <p className="text-sm text-muted-foreground">Total Tasks</p>
        </Card>
        <Card className="glass-card p-4 text-center hover-lift">
          <p className="text-3xl font-bold text-primary">{activeTodos.length}</p>
          <p className="text-sm text-muted-foreground">Active</p>
        </Card>
        <Card className="glass-card p-4 text-center hover-lift col-span-2 md:col-span-1">
          <p className="text-3xl font-bold text-success">{completedTodos.length}</p>
          <p className="text-sm text-muted-foreground">Completed</p>
        </Card>
      </div>

      {/* Add Todo */}
      <Card className="glass-card p-6">
        <div className="flex gap-4">
          <Input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a new task..."
            className="flex-1 bg-secondary/50 border-border/50"
          />
          <Button onClick={addTodo} disabled={!newTodo.trim()} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </Card>

      {/* Active Todos */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <ListTodo className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Active Tasks</h3>
        </div>

        {activeTodos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Circle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No active tasks</p>
            <p className="text-sm">Add a task to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border/30 group"
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => toggleTodo(todo.id)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="flex-1">{todo.text}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTodo(todo.id)}
                  className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Completed Todos */}
      {completedTodos.length > 0 && (
        <Card className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <h3 className="font-semibold">Completed Tasks</h3>
          </div>

          <div className="space-y-3">
            {completedTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-success/10 border border-success/20 group"
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => toggleTodo(todo.id)}
                  className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                />
                <span className="flex-1 text-muted-foreground line-through">{todo.text}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTodo(todo.id)}
                  className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
