import { useState, useEffect } from 'react';
import { CheckCircleIcon, TrashIcon, ExclamationCircleIcon, ClipboardDocumentListIcon, CalendarIcon, ChevronDownIcon, ChevronUpIcon, UserCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';
import Calendar from './Calendar';

interface Todo {
  _id?: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: Date;
  user?: string;
  createdAt: Date;
  updatedAt: Date;
  localId?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  picture?: string;
}

const API_URL = 'http://localhost:3000/api';

export default function Todo() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
      try {
        return JSON.parse(savedTodos);
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/user`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        console.error('Error checking auth status:', err);
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    checkAuth();
  }, []);

  // Sync todos with server when authenticated
  useEffect(() => {
    const syncTodos = async () => {
      if (!isAuthenticated) return;

      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/todos`, {
          credentials: 'include'
        });

        if (response.status === 401) {
          setIsAuthenticated(false);
          setUser(null);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch todos');
        }

        const serverTodos = await response.json();
        const localTodos = JSON.parse(localStorage.getItem('todos') || '[]');
        
        // Merge local and server todos
        const mergedTodos = [...serverTodos];
        
        // Add local todos that don't exist on server
        localTodos.forEach((localTodo: Todo) => {
          if (!localTodo._id && !mergedTodos.some(serverTodo => 
            serverTodo.title === localTodo.title && 
            new Date(serverTodo.createdAt).getTime() === new Date(localTodo.createdAt).getTime()
          )) {
            // Upload local todo to server
            fetch(`${API_URL}/todos`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              credentials: 'include',
              body: JSON.stringify({
                title: localTodo.title,
                description: localTodo.description || '',
                completed: localTodo.completed,
                dueDate: localTodo.dueDate
              })
            })
            .then(response => response.json())
            .then(serverTodo => {
              mergedTodos.push(serverTodo);
              setTodos(mergedTodos);
              localStorage.setItem('todos', JSON.stringify(mergedTodos));
            })
            .catch(err => {
              console.error('Error syncing local todo:', err);
              mergedTodos.push(localTodo);
            });
          }
        });

        setTodos(mergedTodos);
        localStorage.setItem('todos', JSON.stringify(mergedTodos));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    syncTodos();
  }, [isAuthenticated]);

  // Save todos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

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

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    const todo: Todo = {
      title: newTodo,
      description: '',
      completed: false,
      dueDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      localId: `local-${Date.now()}`
    };

    if (isAuthenticated) {
      try {
        const response = await fetch(`${API_URL}/todos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            title: todo.title,
            description: todo.description,
            completed: todo.completed,
            dueDate: todo.dueDate
          }),
        });

        if (response.status === 401) {
          setIsAuthenticated(false);
          setUser(null);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to create todo');
        }

        const serverTodo = await response.json();
        setTodos(prev => [...prev, serverTodo]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create todo');
        // Fallback to local storage
        setTodos(prev => [...prev, todo]);
      }
    } else {
      // Store in local storage only
      setTodos(prev => [...prev, todo]);
    }
    setNewTodo('');
  };

  const toggleTodo = async (id: string) => {
    const todoToUpdate = todos.find(todo => todo._id === id || todo.localId === id);
    if (!todoToUpdate) return;

    const updatedTodo = {
      ...todoToUpdate,
      completed: !todoToUpdate.completed,
      updatedAt: new Date()
    };

    if (isAuthenticated && todoToUpdate._id) {
      try {
        const response = await fetch(`${API_URL}/todos/${todoToUpdate._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(updatedTodo),
        });

        if (response.status === 401) {
          setIsAuthenticated(false);
          setUser(null);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to update todo');
        }

        const serverTodo = await response.json();
        setTodos(prev =>
          prev.map(todo =>
            todo._id === todoToUpdate._id ? serverTodo : todo
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update todo');
        // Fallback to local storage
        setTodos(prev =>
          prev.map(todo =>
            todo.localId === todoToUpdate.localId ? updatedTodo : todo
          )
        );
      }
    } else {
      // Update in local storage only
      setTodos(prev =>
        prev.map(todo =>
          todo.localId === todoToUpdate.localId ? updatedTodo : todo
        )
      );
    }
  };

  const deleteTodo = async (id: string) => {
    const todoToDelete = todos.find(todo => todo._id === id || todo.localId === id);
    if (!todoToDelete) return;

    if (isAuthenticated && todoToDelete._id) {
      try {
        const response = await fetch(`${API_URL}/todos/${todoToDelete._id}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.status === 401) {
          setIsAuthenticated(false);
          setUser(null);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to delete todo');
        }

        setTodos(prev => prev.filter(todo => todo._id !== todoToDelete._id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete todo');
        // Fallback to local storage
        setTodos(prev => prev.filter(todo => todo.localId !== todoToDelete.localId));
      }
    } else {
      // Delete from local storage only
      setTodos(prev => prev.filter(todo => todo.localId !== todoToDelete.localId));
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
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
        const taskDate = new Date(todo.dueDate || todo.createdAt);
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

  const handleTaskTap = (id: string) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // 300ms for double tap

    if (now - lastTapTime < DOUBLE_TAP_DELAY) {
      // Double tap detected
      toggleTodo(id);
    }
    setLastTapTime(now);
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);

    try {
      // Redirect to Google OAuth endpoint
      window.location.href = `${API_URL.replace('/api', '')}/auth/google`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login with Google');
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_URL.replace('/api', '')}/auth/logout`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        setIsAuthenticated(false);
        setUser(null);
        // Keep local todos but mark them as local-only
        const currentTodos = todos.map(todo => ({
          ...todo,
          _id: undefined,
          localId: todo.localId || `local-${Date.now()}`
        }));
        setTodos(currentTodos);
        localStorage.setItem('todos', JSON.stringify(currentTodos));
        setError(null);
      } else {
        throw new Error('Failed to logout');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to logout');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isToday 
        ? 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800'
        : 'bg-gradient-to-br from-gray-200/95 to-gray-300/95 dark:from-gray-800/95 dark:to-gray-900/95 backdrop-blur-sm'
    }`}>
      {/* Login Modal */}
      {showLoginForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 relative">
            <button
              onClick={() => setShowLoginForm(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-center">Login with Google</h2>
            <div className="space-y-4">
              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 transition-colors duration-200 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {isLoggingIn ? 'Logging in...' : 'Continue with Google'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header Row: Title and Actions */}
        <div className="flex items-center justify-between mb-2 gap-2">
          <h1 className={`text-3xl font-bold bg-clip-text text-transparent ${
            isToday 
              ? 'bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300'
              : 'bg-gradient-to-r from-gray-600 to-gray-400 dark:from-gray-400 dark:to-gray-300'
          }`}>
            Todo Today
          </h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={isAuthenticated ? handleLogout : () => setShowLoginForm(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                ${isAuthenticated
                  ? 'text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                }
                hover:bg-gray-100 dark:hover:bg-gray-800`}
            >
              <UserCircleIcon className="w-6 h-6" />
              <span className="hidden sm:inline">
                {isAuthenticated ? 'Logout' : 'Login'}
              </span>
            </button>
          </div>
        </div>
        {/* Date Row */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={toggleCalendar}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
          >
            <CalendarIcon className="w-6 h-6" />
            <span className="text-lg font-medium">{formattedSelectedDate}</span>
          </button>
        </div>
        {/* Hello User Row */}
        {isAuthenticated && user && (
          <div className="mb-4 text-gray-700 dark:text-gray-200">
            Hello, {user.name}
          </div>
        )}

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
              />
              <button
                type="submit"
                disabled={!newTodo.trim()}
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

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-300 animate-fade-in shadow-sm">
            <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
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
                  key={todo._id}
                  className={`todo-item group transition-all duration-300 ${
                    !isToday ? 'bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm' : ''
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => handleTaskTap(todo._id)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTodo(todo._id);
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
                    {todo.title}
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTodo(todo._id);
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
                          key={todo._id}
                          className={`todo-item group transition-all duration-300 opacity-75 ${
                            !isToday ? 'bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm' : ''
                          }`}
                          style={{ animationDelay: `${index * 50}ms` }}
                          onClick={() => handleTaskTap(todo._id)}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTodo(todo._id);
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
                            {todo.title}
                          </span>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTodo(todo._id);
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