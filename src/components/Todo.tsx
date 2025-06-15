import { useState, useEffect } from 'react';
import { CheckCircleIcon, TrashIcon, ExclamationCircleIcon, ClipboardDocumentListIcon, CalendarIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';
import Calendar from './Calendar';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: number;
}

const MAX_TASKS = 100;

export default function Todo() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    // Load todos from localStorage on initial render
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
      try {
        const parsed = JSON.parse(savedTodos);
        // Ensure we only load up to MAX_TASKS
        return parsed.slice(0, MAX_TASKS);
      } catch (error) {
        console.error('Error parsing todos from localStorage:', error);
        return [];
      }
    }
    return [];
  });
  const [newTodo, setNewTodo] = useState('');
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [showArchiveMessage, setShowArchiveMessage] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [showCompleted, setShowCompleted] = useState(true);

  // Update date every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Format date as "Monday, January 1"
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  // Check for new day and archive completed tasks
  useEffect(() => {
    const checkNewDay = () => {
      const lastVisit = localStorage.getItem('lastVisit');
      const today = new Date().toDateString();
      
      if (lastVisit !== today) {
        const completedTasks = todos.filter(todo => todo.completed);
        if (completedTasks.length > 0) {
          // Archive completed tasks
          const archivedTasks = JSON.parse(localStorage.getItem('archivedTasks') || '[]');
          const newArchivedTasks = [
            ...archivedTasks,
            ...completedTasks.map(task => ({
              ...task,
              archivedAt: Date.now()
            }))
          ];
          localStorage.setItem('archivedTasks', JSON.stringify(newArchivedTasks));
          
          // Remove completed tasks from current todos
          setTodos(prev => prev.filter(todo => !todo.completed));
          setShowArchiveMessage(true);
          setTimeout(() => setShowArchiveMessage(false), 3000);
        }
        localStorage.setItem('lastVisit', today);
      }
    };

    checkNewDay();
    const interval = setInterval(checkNewDay, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [todos]);

  // Save todos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    if (todos.length >= MAX_TASKS) {
      setShowLimitWarning(true);
      setTimeout(() => setShowLimitWarning(false), 3000);
      return;
    }

    const todo: Todo = {
      id: Date.now(),
      text: newTodo.trim(),
      completed: false,
      createdAt: new Date().setHours(0, 0, 0, 0) // Set to start of today
    };

    setTodos(prev => [...prev, todo]);
    setNewTodo('');
    setSelectedDate(new Date()); // Reset to today's date when adding a new task
  };

  const toggleTodo = (id: number) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: number) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // Reset the form when changing dates
    setNewTodo('');
  };

  const toggleCalendar = () => {
    setIsCalendarOpen(!isCalendarOpen);
  };

  const formattedSelectedDate = selectedDate
    ? selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : formattedDate;

  const filteredTodos = selectedDate
    ? todos.filter(todo => {
        const taskDate = new Date(todo.createdAt);
        return (
          taskDate.getDate() === selectedDate.getDate() &&
          taskDate.getMonth() === selectedDate.getMonth() &&
          taskDate.getFullYear() === selectedDate.getFullYear()
        );
      })
    : todos;

  const isToday = selectedDate 
    ? new Date().toDateString() === selectedDate.toDateString()
    : true;

  const handleTaskTap = (id: number) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // 300ms for double tap

    if (now - lastTapTime < DOUBLE_TAP_DELAY) {
      // Double tap detected
      toggleTodo(id);
    }
    setLastTapTime(now);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isToday 
        ? 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800'
        : 'bg-gradient-to-br from-gray-200/95 to-gray-300/95 dark:from-gray-800/95 dark:to-gray-900/95 backdrop-blur-sm'
    }`}>
      <div className="max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className={`text-3xl sm:text-4xl font-bold bg-clip-text text-transparent ${
              isToday 
                ? 'bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300'
                : 'bg-gradient-to-r from-gray-600 to-gray-400 dark:from-gray-400 dark:to-gray-300'
            }`}>
              Todo Today
            </h1>
            <button
              onClick={toggleCalendar}
              className={`mt-4 group flex items-center gap-2 px-3 py-1.5 rounded-lg
                       text-lg sm:text-xl font-medium 
                       ${isToday 
                         ? 'text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400'
                         : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                       }
                       hover:bg-gray-100 dark:hover:bg-gray-800
                       transition-all duration-200
                       calendar-button`}
            >
              <CalendarIcon className={`w-5 h-5 sm:w-6 sm:h-6 
                                     ${isToday 
                                       ? 'text-blue-500 dark:text-blue-400'
                                       : 'text-gray-500 dark:text-gray-400'
                                     }
                                     group-hover:scale-110 transition-transform duration-200`} />
              <span className="group-hover:translate-x-0.5 transition-transform duration-200">
                {formattedSelectedDate}
              </span>
            </button>
          </div>
          <ThemeToggle />
        </div>

        <Calendar
          tasks={todos}
          onDateSelect={handleDateSelect}
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
        />

        {isToday && (
          <form onSubmit={addTodo} className="mb-8">
            <div className="flex gap-3">
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="What needs to be done?"
                className="todo-input"
                disabled={todos.length >= MAX_TASKS}
              />
              <button
                type="submit"
                disabled={!newTodo.trim() || todos.length >= MAX_TASKS}
                className="todo-button"
              >
                Add
              </button>
            </div>
          </form>
        )}

        <div className={`task-count ${!isToday ? 'opacity-75' : ''}`}>
          <span>Tasks: <span className="task-count-badge">{filteredTodos.length}</span></span>
          <span>Completed: <span className="task-count-badge">{filteredTodos.filter(todo => todo.completed).length}</span></span>
        </div>

        {showLimitWarning && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-center gap-3 text-yellow-700 dark:text-yellow-300 animate-fade-in shadow-sm">
            <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">Maximum limit of {MAX_TASKS} tasks reached. Please complete or delete some tasks first.</span>
          </div>
        )}

        {showArchiveMessage && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-3 text-blue-700 dark:text-blue-300 animate-fade-in shadow-sm">
            <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">Completed tasks have been archived for the new day.</span>
          </div>
        )}

        <div className="space-y-3">
          {filteredTodos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
              <div className={`w-20 h-20 mb-6 transform hover:scale-110 transition-transform duration-300 ${
                isToday ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'
              }`}>
                <ClipboardDocumentListIcon className="w-full h-full" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">
                {selectedDate ? 'No tasks for this date' : 'No tasks yet'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                {selectedDate 
                  ? isToday 
                    ? 'Add a task above to get started.'
                    : 'No tasks were created on this date.'
                  : 'Add a task above to get started. You can mark tasks as complete and delete them when you\'re done.'}
              </p>
            </div>
          ) : (
            <>
              {/* Incomplete Tasks */}
              {filteredTodos.filter(todo => !todo.completed).map((todo, index) => (
                <div
                  key={todo.id}
                  className={`todo-item group transition-all duration-300 ${
                    !isToday ? 'bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm' : ''
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => handleTaskTap(todo.id)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTodo(todo.id);
                    }}
                    className={`todo-check ${
                      isToday 
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  
                  <span className={`flex-1 text-sm sm:text-base transition-all duration-300 ${
                    !isToday ? 'text-gray-600 dark:text-gray-300' : ''
                  }`}>
                    {todo.text}
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTodo(todo.id);
                    }}
                    className="todo-delete opacity-0 group-hover:opacity-100 sm:opacity-100"
                    aria-label="Delete task"
                  >
                    <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              ))}

              {/* Completed Tasks Section */}
              {filteredTodos.filter(todo => todo.completed).length > 0 && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm ${
                      isToday 
                        ? 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                    } transition-colors duration-200`}
                  >
                    <span>Completed Tasks</span>
                    {showCompleted ? (
                      <ChevronUpIcon className="w-5 h-5" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5" />
                    )}
                  </button>
                  
                  {showCompleted && (
                    <div className="mt-2 space-y-3">
                      {filteredTodos.filter(todo => todo.completed).map((todo, index) => (
                        <div
                          key={todo.id}
                          className={`todo-item group transition-all duration-300 opacity-75 ${
                            !isToday ? 'bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm' : ''
                          }`}
                          style={{ animationDelay: `${index * 50}ms` }}
                          onClick={() => handleTaskTap(todo.id)}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTodo(todo.id);
                            }}
                            className="todo-check text-green-500"
                          >
                            <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                          </button>
                          
                          <span className={`flex-1 text-sm sm:text-base transition-all duration-300 line-through ${
                            isToday 
                              ? 'text-gray-500 dark:text-gray-400'
                              : 'text-gray-600 dark:text-gray-300'
                          }`}>
                            {todo.text}
                          </span>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTodo(todo.id);
                            }}
                            className="todo-delete opacity-0 group-hover:opacity-100 sm:opacity-100"
                            aria-label="Delete task"
                          >
                            <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 