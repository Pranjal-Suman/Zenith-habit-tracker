import { useState, useEffect, useCallback } from 'react';
import { db } from './db.js';
import { 
  Circle, Plus, Trash2, Edit3, Flame, 
  TrendingUp, Sparkles, Check, X, 
  BarChart2, RefreshCw, Home, ListTodo, Settings, ChevronRight,
  Zap
} from 'lucide-react';

export default function App() {
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [activeTab, setActiveTab] = useState('today'); // 'today', 'habits', 'analytics', 'settings'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [habitName, setHabitName] = useState('');
  const [habitCategory, setHabitCategory] = useState('Health');
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);

  const CATEGORIES = [
    { id: 'Health', name: 'Health & Vitality', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { id: 'Productivity', name: 'Deep Work', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { id: 'Mindfulness', name: 'Mind & Zen', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    { id: 'Fitness', name: 'Physical Peak', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    { id: 'Learning', name: 'Skill Mastery', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' }
  ];

  const QUOTES = [
    "We are what we repeatedly do. Excellence is not an act, but a habit.",
    "Small daily improvements over time lead to stunning results.",
    "Don't break the chain. Every single check-in builds your identity.",
    "You do not rise to the level of your goals. You fall to the level of your systems."
  ];

  const getTodayDateString = () => {
    const d = new Date();
    return formatDate(d);
  };

  const getLastNDays = (n = 7) => {
    const dates = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(formatDate(d));
    }
    return dates;
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all([db.habits.toArray(), db.completions.toArray()])
      .then(([allHabits, allCompletions]) => {
        if (cancelled) return;
        setHabits(allHabits);
        setCompletions(allCompletions);
        setIsLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error fetching IndexedDB data:', err);
        setLoadError('Unable to load habits from local storage.');
        setIsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const allHabits = await db.habits.toArray();
      const allCompletions = await db.completions.toArray();
      setHabits(allHabits);
      setCompletions(allCompletions);
      setLoadError('');
      setIsLoaded(true);
    } catch (err) {
      console.error('Error fetching IndexedDB data:', err);
      setLoadError('Unable to load habits from local storage.');
      setIsLoaded(true);
    }
  }, []);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAddModal = () => {
    setEditingHabit(null);
    setHabitName('');
    setHabitCategory('Health');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (habit) => {
    setEditingHabit(habit);
    setHabitName(habit.name);
    setHabitCategory(habit.category || 'Health');
    setIsModalOpen(true);
  };

  const handleSaveHabit = async (e) => {
    e.preventDefault();
    if (!habitName.trim()) return;

    if (editingHabit) {
      await db.habits.update(editingHabit.id, {
        name: habitName.trim(),
        category: habitCategory
      });
      triggerToast("Habit updated successfully!");
    } else {
      await db.habits.add({
        name: habitName.trim(),
        category: habitCategory,
        createdAt: getTodayDateString()
      });
      triggerToast("New habit created! Let's build consistency.");
    }
    setIsModalOpen(false);
    setHabitName('');
    fetchData();
  };

  const handleDeleteHabit = async (id) => {
    if (window.confirm("Are you sure you want to delete this habit and all its history?")) {
      await db.habits.delete(id);
      const relCompletions = await db.completions.where('habitId').equals(id).toArray();
      const compIds = relCompletions.map(c => c.id);
      await db.completions.bulkDelete(compIds);
      triggerToast("Habit deleted.");
      fetchData();
    }
  };

  const toggleCompletion = async (habitId, dateStr) => {
    const existing = completions.find(c => c.habitId === habitId && c.date === dateStr);
    if (existing) {
      await db.completions.delete(existing.id);
    } else {
      await db.completions.add({ habitId, date: dateStr });
      triggerToast("Streak maintained! 🔥 Great job!");
    }
    fetchData();
  };

  const todayStr = getTodayDateString();
  const last30Days = getLastNDays(30);

  const calculateStreaks = (habitId) => {
    const habitCompletions = completions
      .filter(c => c.habitId === habitId)
      .map(c => c.date);

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    let checkDate = new Date();
    while (true) {
      const ds = formatDate(checkDate);
      if (habitCompletions.includes(ds)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (ds === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yesterdayDs = formatDate(checkDate);
          if (habitCompletions.includes(yesterdayDs)) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }

    const sorted = [...habitCompletions].sort();
    let prevDate = null;
    sorted.forEach(dStr => {
      const d = new Date(dStr);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffTime = Math.abs(d - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      prevDate = d;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    });

    return { currentStreak, bestStreak };
  };

  const totalHabits = habits.length;
  const completedTodayCount = habits.filter(h => 
    completions.some(c => c.habitId === h.id && c.date === todayStr)
  ).length;
  const overallTodayRate = totalHabits > 0 ? Math.round((completedTodayCount / totalHabits) * 100) : 0;

  const bestOverallStreak = habits.reduce((max, h) => {
    const { bestStreak } = calculateStreaks(h.id);
    return Math.max(max, bestStreak);
  }, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-28">
      {/* Ambient Glow Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-900/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-80 h-80 bg-purple-900/15 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 pt-6 sm:max-w-xl md:max-w-2xl">
        
        {/* Top Header */}
        <header className="flex items-center justify-between mb-6 bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 p-4 sm:p-5 rounded-3xl shadow-xl">
          <div>
            <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-0.5">
              <Sparkles className="w-3.5 h-3.5" /> Zenith OS (IndexedDB)
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Habit Tracker</h1>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleOpenAddModal}
              className="w-10 h-10 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
              title="Add Habit"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top duration-300">
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Daily Motivation Card */}
        <div 
          onClick={() => setQuoteIndex((prev) => (prev + 1) % QUOTES.length)}
          className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 p-4 sm:p-5 rounded-3xl mb-6 cursor-pointer shadow-lg active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">Daily Mindset (Tap to shuffle)</p>
                <p className="text-xs sm:text-sm text-slate-200 font-medium italic mt-0.5">"{QUOTES[quoteIndex]}"</p>
              </div>
            </div>
            <RefreshCw className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-2" />
          </div>
        </div>

        {/* Tab 1: Today */}
        {activeTab === 'today' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-4 rounded-3xl shadow-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Today's Rate</p>
                  <p className="text-lg font-bold text-white">{completedTodayCount}/{totalHabits} <span className="text-xs font-normal text-slate-400">({overallTodayRate}%)</span></p>
                </div>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-4 rounded-3xl shadow-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Top Streak</p>
                  <p className="text-lg font-bold text-white">{bestOverallStreak} <span className="text-xs font-normal text-slate-400">Days</span></p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-xl overflow-hidden p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-white">Today's Focus</h2>
                  <p className="text-xs text-slate-400">Tap to complete today's check-in</p>
                </div>
                <div className="text-xs text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-xl">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              </div>

              {!isLoaded ? (
                <div className="py-12 text-center text-slate-400 text-xs">Loading IndexedDB...</div>
              ) : loadError ? (
                <div className="py-12 text-center text-rose-400 text-xs">{loadError}</div>
              ) : habits.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-3">
                    <ListTodo className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">No habits found</h3>
                  <p className="text-xs text-slate-400 mb-5">Create your first routine to kickstart your journey.</p>
                  <button 
                    onClick={handleOpenAddModal}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-2xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    Add First Habit
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {habits.map((habit) => {
                    const isCompleted = completions.some(c => c.habitId === habit.id && c.date === todayStr);
                    const { currentStreak } = calculateStreaks(habit.id);
                    const catConfig = CATEGORIES.find(c => c.id === habit.category) || CATEGORIES[0];

                    return (
                      <div 
                        key={habit.id}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          isCompleted 
                            ? 'bg-indigo-950/20 border-indigo-500/30 shadow-inner' 
                            : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <button
                            onClick={() => toggleCompletion(habit.id, todayStr)}
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all transform active:scale-90 ${
                              isCompleted 
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 border border-indigo-400/30' 
                                : 'bg-slate-900 border-2 border-dashed border-slate-700 text-slate-600 hover:border-indigo-500'
                            }`}
                          >
                            {isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : <Circle className="w-4 h-4 opacity-40" />}
                          </button>

                          <div className="min-w-0">
                            <h4 className={`font-semibold text-sm truncate ${isCompleted ? 'text-indigo-200 line-through opacity-80' : 'text-white'}`}>
                              {habit.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-medium border ${catConfig.color}`}>
                                {habit.category || 'Health'}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                <Flame className="w-3 h-3 fill-amber-400" /> {currentStreak}d streak
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Habits Management */}
        {activeTab === 'habits' && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 rounded-3xl shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white">Manage Habits</h2>
                <button 
                  onClick={handleOpenAddModal}
                  className="bg-indigo-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-md"
                >
                  + New
                </button>
              </div>

              {habits.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No habits added yet.</p>
              ) : (
                <div className="space-y-3">
                  {habits.map((habit) => {
                    const { currentStreak, bestStreak } = calculateStreaks(habit.id);
                    const catConfig = CATEGORIES.find(c => c.id === habit.category) || CATEGORIES[0];
                    return (
                      <div key={habit.id} className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl">
                        <div className="min-w-0 pr-2">
                          <h4 className="font-semibold text-sm text-white truncate mb-1">{habit.name}</h4>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] border ${catConfig.color}`}>{habit.category}</span>
                            <span className="text-[10px] text-slate-400">Streak: {currentStreak}d (Best: {bestStreak}d)</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            onClick={() => handleOpenEditModal(habit)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteHabit(habit.id)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 rounded-3xl shadow-xl">
              <h2 className="text-base font-bold text-white mb-1">Performance Heatmap</h2>
              <p className="text-xs text-slate-400 mb-6">Last 30 days activity matrix across all routines.</p>

              <div className="grid grid-cols-6 gap-2 mb-6">
                {last30Days.map(dStr => {
                  const dayComps = completions.filter(c => c.date === dStr).length;
                  const ratio = totalHabits > 0 ? dayComps / totalHabits : 0;
                  let bgClass = 'bg-slate-800';
                  if (ratio > 0.7) bgClass = 'bg-indigo-500 shadow-sm shadow-indigo-500/40';
                  else if (ratio > 0.3) bgClass = 'bg-indigo-700/60';
                  else if (ratio > 0) bgClass = 'bg-indigo-900/40';

                  return (
                    <div 
                      key={dStr} 
                      className={`h-10 rounded-xl flex flex-col items-center justify-center border border-slate-700/40 ${bgClass}`}
                      title={`${dStr}: ${dayComps} completed`}
                    >
                      <span className="text-[9px] text-slate-300 font-bold">{new Date(dStr).getDate()}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-800 pt-5">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Habit Breakdown</h3>
                <div className="space-y-4">
                  {habits.map(habit => {
                    const { currentStreak, bestStreak } = calculateStreaks(habit.id);
                    const habitCompsCount = completions.filter(c => c.habitId === habit.id).length;
                    return (
                      <div key={habit.id} className="bg-slate-950/40 border border-slate-800/80 p-3.5 rounded-2xl">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-white truncate">{habit.name}</span>
                          <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                            <Flame className="w-3 h-3 fill-amber-400" /> {currentStreak}d streak
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Total Check-ins: {habitCompsCount}</span>
                          <span>Best Streak: {bestStreak}d</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 rounded-3xl shadow-xl">
              <h2 className="text-base font-bold text-white mb-2">Database & Storage</h2>
              <p className="text-xs text-slate-400 mb-6">Powered locally by Dexie & IndexedDB. Your data stays strictly on your device.</p>

              <div className="space-y-3">
                <button 
                  onClick={async () => {
                    const allHabits = await db.habits.toArray();
                    const allComps = await db.completions.toArray();
                    const data = { habits: allHabits, completions: allComps };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `habit-tracker-backup-${getTodayDateString()}.json`;
                    a.click();
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-2xl text-xs font-semibold flex items-center justify-between transition-all"
                >
                  <span>Export Database JSON</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button 
                  onClick={async () => {
                    if (window.confirm("WARNING: This will clear all habits and completion history from IndexedDB. Are you sure?")) {
                      await db.habits.clear();
                      await db.completions.clear();
                      triggerToast("Database cleared successfully.");
                      fetchData();
                    }
                  }}
                  className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 p-3 rounded-2xl text-xs font-semibold flex items-center justify-between transition-all"
                >
                  <span>Reset All Data</span>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-2xl border-t border-slate-800/80 px-6 py-3 max-w-md mx-auto sm:max-w-xl md:max-w-2xl rounded-t-3xl shadow-2xl">
        <div className="flex items-center justify-around">
          <button 
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'today' ? 'text-indigo-400 scale-105' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Today</span>
          </button>

          <button 
            onClick={() => setActiveTab('habits')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'habits' ? 'text-indigo-400 scale-105' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <ListTodo className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Habits</span>
          </button>

          <button 
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'analytics' ? 'text-indigo-400 scale-105' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <BarChart2 className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Analytics</span>
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'settings' ? 'text-indigo-400 scale-105' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Settings</span>
          </button>
        </div>
      </nav>

      {/* Add / Edit Habit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg p-6 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">{editingHabit ? 'Edit Habit' : 'New Habit'}</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHabit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Habit Name</label>
                <input 
                  type="text" 
                  value={habitName} 
                  onChange={(e) => setHabitName(e.target.value)} 
                  placeholder="e.g., Morning Meditation, Code 1 hour..." 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setHabitCategory(cat.id)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left transition-all ${
                        habitCategory === cat.id 
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' 
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  {editingHabit ? 'Save Changes' : 'Create Habit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}