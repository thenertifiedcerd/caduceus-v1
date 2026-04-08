import React, { useEffect, useState, useContext } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { signOut } from 'firebase/auth';
import { Timestamp, collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { Moon, Sun, LogOut } from 'lucide-react';
import WorkoutLogger from '../components/WorkoutLogger';
import HealthMetrics from '../components/HealthMetrics';
import MealLogger from '../components/MealLogger';
import { updateMetaTags } from '../utils/seo';
import { auth, db } from '../firebase';
import { ThemeContext } from '../ThemeContext';
import './DataPage.css';

const formatDayKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRecentDayKeys = (days) => {
  const list = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    list.push({
      key: formatDayKey(date),
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
    });
  }

  return list;
};

const buildTrendPath = (values, width, height, padding = 16) => {
  if (!values.length) {
    return '';
  }

  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = Math.max(1, maxValue - minValue);
  const xStep = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = padding + index * xStep;
      const normalized = (value - minValue) / range;
      const y = height - padding - normalized * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
};

const TREND_METRICS = {
  score: {
    label: 'Score',
    subtitle: 'Daily score from workouts, meals, and calorie consistency',
    stroke: '#10b981',
    fillStart: 'rgba(16, 185, 129, 0.35)',
    fillEnd: 'rgba(16, 185, 129, 0.03)',
    formatter: (value) => `${Math.round(value)}`,
  },
  calories: {
    label: 'Calories',
    subtitle: 'Daily meal calories logged',
    stroke: '#f97316',
    fillStart: 'rgba(249, 115, 22, 0.35)',
    fillEnd: 'rgba(249, 115, 22, 0.03)',
    formatter: (value) => `${Math.round(value).toLocaleString()} kcal`,
  },
  workouts: {
    label: 'Workouts',
    subtitle: 'Workout logs completed each day',
    stroke: '#6366f1',
    fillStart: 'rgba(99, 102, 241, 0.35)',
    fillEnd: 'rgba(99, 102, 241, 0.03)',
    formatter: (value) => `${Math.round(value)}`,
  },
  meals: {
    label: 'Meals',
    subtitle: 'Meal logs captured each day',
    stroke: '#0ea5e9',
    fillStart: 'rgba(14, 165, 233, 0.35)',
    fillEnd: 'rgba(14, 165, 233, 0.03)',
    formatter: (value) => `${Math.round(value)}`,
  },
};

const buildCoachInsight = (summary) => {
  const points = [];

  if (summary.workoutsLogged >= 3) {
    points.push('Great consistency: you logged at least 3 workouts this week.');
  } else {
    points.push('Try to log at least 3 sessions per week for stronger progress signals.');
  }

  if (summary.latestWeightKg !== null) {
    if (summary.weeklyWeightDeltaKg === null) {
      points.push('Add one more weight entry this week so trend analysis can begin.');
    } else if (summary.weeklyWeightDeltaKg < 0) {
      points.push(`Weight is trending down (${Math.abs(summary.weeklyWeightDeltaKg)} kg this week). Keep intake and recovery balanced.`);
    } else if (summary.weeklyWeightDeltaKg > 0) {
      points.push(`Weight is trending up (+${summary.weeklyWeightDeltaKg} kg this week). Review meal consistency and training load.`);
    } else {
      points.push('Weight is stable this week. Good baseline for performance-focused training.');
    }
  } else {
    points.push('No weight entries yet. Log weight 2-3 times weekly for reliable insights.');
  }

  if (summary.weeklyCalories > 0) {
    points.push(`Logged meal calories this week: ${summary.weeklyCalories.toLocaleString()} kcal.`);
  } else {
    points.push('Meal logs are missing calories. Add meals to improve nutrition insights.');
  }

  return points.join(' ');
};

const DataPage = ({ user }) => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [summaryError, setSummaryError] = useState('');
  const [optimisticSummaryDelta, setOptimisticSummaryDelta] = useState({
    workoutsLogged: 0,
    mealsLogged: 0,
    weeklyCalories: 0,
  });
  const [weeklyTrend, setWeeklyTrend] = useState([]);
  const [activeTrendMetric, setActiveTrendMetric] = useState('score');
  const [weeklySummary, setWeeklySummary] = useState({
    periodDays: 7,
    workoutsLogged: 0,
    mealsLogged: 0,
    weeklyCalories: 0,
    latestWeightKg: null,
    weeklyWeightDeltaKg: null,
    consistencyScore: 0,
  });

  const applyOptimisticSummaryDelta = (delta = {}) => {
    const safeDelta = {
      workoutsLogged: Number(delta.workoutsLogged || 0),
      mealsLogged: Number(delta.mealsLogged || 0),
      weeklyCalories: Number(delta.weeklyCalories || 0),
    };

    setOptimisticSummaryDelta((current) => ({
      workoutsLogged: Math.max(0, current.workoutsLogged + safeDelta.workoutsLogged),
      mealsLogged: Math.max(0, current.mealsLogged + safeDelta.mealsLogged),
      weeklyCalories: Math.max(0, current.weeklyCalories + safeDelta.weeklyCalories),
    }));
  };

  const displayedSummary = {
    ...weeklySummary,
    workoutsLogged: weeklySummary.workoutsLogged + optimisticSummaryDelta.workoutsLogged,
    mealsLogged: weeklySummary.mealsLogged + optimisticSummaryDelta.mealsLogged,
    weeklyCalories: weeklySummary.weeklyCalories + optimisticSummaryDelta.weeklyCalories,
  };

  const hasPendingWorkoutDelta = optimisticSummaryDelta.workoutsLogged > 0;
  const hasPendingMealDelta = optimisticSummaryDelta.mealsLogged > 0;
  const hasPendingScoreDelta = hasPendingWorkoutDelta || hasPendingMealDelta;
  const activeTrendConfig = TREND_METRICS[activeTrendMetric] || TREND_METRICS.score;
  const trendValues = weeklyTrend.map((entry) => Number(entry[activeTrendMetric] || 0));
  const trendPath = buildTrendPath(trendValues, 560, 180, 18);

  displayedSummary.consistencyScore = Math.min(
    100,
    displayedSummary.workoutsLogged * 12 +
      displayedSummary.mealsLogged * 6 +
      (weeklySummary.latestWeightKg !== null || weeklySummary.weeklyWeightDeltaKg !== null ? 16 : 0)
  );

  const coachInsight = buildCoachInsight(displayedSummary);

  useEffect(() => {
    updateMetaTags({
      title: 'My Health Dashboard - Caduceus',
      description: 'View your health metrics, workout logs, and personalized coach insights. Track progress and achieve your fitness goals.',
    });
  }, []);

  useEffect(() => {
    const loadWeeklySummary = async () => {
      if (!user?.uid) {
        return;
      }

      setSummaryError('');

      try {
        const weekStart = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

        const workoutsQuery = query(
          collection(db, 'workout_logs'),
          where('uid', '==', user.uid),
          where('createdAt', '>=', weekStart)
        );

        const metricsQuery = query(
          collection(db, 'body_metrics'),
          where('uid', '==', user.uid),
          where('createdAt', '>=', weekStart)
        );

        const mealsQuery = query(
          collection(db, 'meal_logs'),
          where('uid', '==', user.uid),
          where('createdAt', '>=', weekStart)
        );

        const [workoutsSnapshot, metricsSnapshot, mealsSnapshot] = await Promise.all([
          getDocs(workoutsQuery),
          getDocs(metricsQuery),
          getDocs(mealsQuery),
        ]);

        const workoutsLogged = workoutsSnapshot.size;
        const mealsLogged = mealsSnapshot.size;
        const weeklyCalories = mealsSnapshot.docs.reduce((total, docSnapshot) => {
          const value = Number(docSnapshot.data().calories || 0);
          return total + (Number.isFinite(value) ? value : 0);
        }, 0);

        const weightEntries = metricsSnapshot.docs
          .map((docSnapshot) => {
            const data = docSnapshot.data();
            return {
              weightKg: Number(data.weightKg),
              createdAtMs: data.createdAt?.toMillis?.() || 0,
            };
          })
          .filter((entry) => Number.isFinite(entry.weightKg))
          .sort((a, b) => a.createdAtMs - b.createdAtMs);

        const firstWeight = weightEntries[0]?.weightKg ?? null;
        const latestWeightKg = weightEntries.length ? weightEntries[weightEntries.length - 1].weightKg : null;
        const weeklyWeightDeltaKg =
          firstWeight !== null && latestWeightKg !== null ? Number((latestWeightKg - firstWeight).toFixed(1)) : null;
        const consistencyScore = Math.min(100, workoutsLogged * 12 + mealsLogged * 6 + (weightEntries.length > 0 ? 16 : 0));

        const recentDays = getRecentDayKeys(7);
        const trendByDay = recentDays.reduce((acc, day) => {
          acc[day.key] = {
            label: day.label,
            workouts: 0,
            meals: 0,
            calories: 0,
          };
          return acc;
        }, {});

        workoutsSnapshot.docs.forEach((docSnapshot) => {
          const createdAtMs = docSnapshot.data().createdAt?.toMillis?.();
          if (!createdAtMs) {
            return;
          }

          const dayKey = formatDayKey(new Date(createdAtMs));
          if (trendByDay[dayKey]) {
            trendByDay[dayKey].workouts += 1;
          }
        });

        mealsSnapshot.docs.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          const createdAtMs = data.createdAt?.toMillis?.();
          if (!createdAtMs) {
            return;
          }

          const dayKey = formatDayKey(new Date(createdAtMs));
          if (!trendByDay[dayKey]) {
            return;
          }

          trendByDay[dayKey].meals += 1;
          const caloriesValue = Number(data.calories || 0);
          trendByDay[dayKey].calories += Number.isFinite(caloriesValue) ? caloriesValue : 0;
        });

        const trendSeries = recentDays.map((day) => {
          const dayData = trendByDay[day.key] || {
            label: day.label,
            workouts: 0,
            meals: 0,
            calories: 0,
          };

          return {
            ...dayData,
            score: Math.min(100, dayData.workouts * 20 + dayData.meals * 10 + (dayData.calories >= 1200 ? 12 : 0)),
          };
        });

        setWeeklyTrend(trendSeries);

        const nextSummary = {
          periodDays: 7,
          workoutsLogged,
          mealsLogged,
          weeklyCalories,
          latestWeightKg,
          weeklyWeightDeltaKg,
          consistencyScore,
        };

        setWeeklySummary((previousSummary) => {
          const resolvedWorkoutDelta = Math.max(0, nextSummary.workoutsLogged - previousSummary.workoutsLogged);
          const resolvedMealDelta = Math.max(0, nextSummary.mealsLogged - previousSummary.mealsLogged);
          const resolvedCaloriesDelta = Math.max(0, nextSummary.weeklyCalories - previousSummary.weeklyCalories);

          setOptimisticSummaryDelta((current) => ({
            workoutsLogged: Math.max(0, current.workoutsLogged - resolvedWorkoutDelta),
            mealsLogged: Math.max(0, current.mealsLogged - resolvedMealDelta),
            weeklyCalories: Math.max(0, current.weeklyCalories - resolvedCaloriesDelta),
          }));

          return nextSummary;
        });

        await setDoc(
          doc(db, 'ai_insights', `${user.uid}_weekly`),
          {
            uid: user.uid,
            type: 'weekly-summary',
            summary: nextSummary,
            coachInsight: buildCoachInsight(nextSummary),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error('Error loading weekly summary:', error);
        setSummaryError('Log for a week to see more info.');
        setWeeklyTrend([]);
      }
    };

    loadWeeklySummary();
  }, [user?.uid, refreshKey]);

  const handleLogout = async () => {
    setLogoutError('');
    setIsLoggingOut(true);

    try {
      await signOut(auth);
    } catch (error) {
      setLogoutError('Could not log out. Please try again.');
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Container fluid className={`data-page py-5 ${isDarkMode ? 'data-page-dark' : 'data-page-light'}`}>
      <div className="data-page-content">
        <header className="data-header">
          <div>
            <h1 className="display-5 fw-bold mb-0">
              <span className="brand-gradient-hover">Caduceus</span> <span className="text-primary">Dashboard</span>
            </h1>
            <p className="data-subtitle">StayHealthy Inc. | Personal Health Intelligence</p>
          </div>
          <div className="data-actions" role="group" aria-label="Dashboard controls">
            <Button
              variant={isDarkMode ? 'light' : 'outline-secondary'}
              onClick={toggleTheme}
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
              className="theme-toggle-btn"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <Button variant="outline-danger" onClick={handleLogout} disabled={isLoggingOut} className="logout-btn">
              <LogOut size={18} />
              {isLoggingOut ? 'Logging out...' : 'Log out'}
            </Button>
          </div>
        </header>

        {logoutError ? <p className="text-danger mb-4 text-center">{logoutError}</p> : null}

        <div className="dashboard-layout">
          <section className="data-section-card dashboard-summary">
            <div className="data-section-title">Weekly Summary</div>
            {summaryError ? <p className="summary-error text-danger mb-0">{summaryError}</p> : null}

            <div className="metric-grid mb-4">
              <article className="metric-card metric-workouts h-100">
                <p className="metric-label">
                  Workouts (7d)
                  {hasPendingWorkoutDelta ? <span className="metric-pending-badge">+{optimisticSummaryDelta.workoutsLogged} pending</span> : null}
                </p>
                <h3 className="metric-value">{displayedSummary.workoutsLogged}</h3>
              </article>
              <article className="metric-card metric-meals h-100">
                <p className="metric-label">
                  Meals (7d)
                  {hasPendingMealDelta ? <span className="metric-pending-badge">+{optimisticSummaryDelta.mealsLogged} pending</span> : null}
                </p>
                <h3 className="metric-value">{displayedSummary.mealsLogged}</h3>
              </article>
              <article className="metric-card metric-weight h-100">
                <p className="metric-label">Weight Delta (7d)</p>
                <h3 className="metric-value">{displayedSummary.weeklyWeightDeltaKg !== null ? `${displayedSummary.weeklyWeightDeltaKg} kg` : 'N/A'}</h3>
              </article>
              <article className="metric-card metric-score h-100">
                <p className="metric-label">
                  Consistency Score
                  {hasPendingScoreDelta ? <span className="metric-pending-badge">pending</span> : null}
                </p>
                <h3 className="metric-value">{displayedSummary.consistencyScore}/100</h3>
              </article>
            </div>

            <article className="coach-card">
              <p className="coach-kicker">
                Coach Insight
                {hasPendingScoreDelta ? <span className="metric-pending-badge">pending</span> : null}
              </p>
              <p className="coach-copy mb-0">{coachInsight}</p>
            </article>

            <article className="trend-card">
              <div className="trend-head">
                <p className="trend-title mb-0">7-Day Change Trend</p>
                <p className="trend-subtitle mb-0">{activeTrendConfig.subtitle}</p>
              </div>

              <div className="trend-toggle-row" role="tablist" aria-label="Trend metric toggles">
                {Object.entries(TREND_METRICS).map(([metricKey, metricConfig]) => (
                  <button
                    key={metricKey}
                    type="button"
                    role="tab"
                    aria-selected={activeTrendMetric === metricKey}
                    className={`trend-toggle-btn ${activeTrendMetric === metricKey ? 'is-active' : ''}`}
                    onClick={() => setActiveTrendMetric(metricKey)}
                  >
                    {metricConfig.label}
                  </button>
                ))}
              </div>

              <div className="trend-chart-wrap" role="img" aria-label={`Seven day ${activeTrendConfig.label.toLowerCase()} trend`}>
                {weeklyTrend.length > 0 ? (
                  <svg
                    viewBox="0 0 560 180"
                    className="trend-chart"
                    preserveAspectRatio="none"
                    style={{
                      '--trend-stroke': activeTrendConfig.stroke,
                      '--trend-fill-start': activeTrendConfig.fillStart,
                      '--trend-fill-end': activeTrendConfig.fillEnd,
                    }}
                  >
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--trend-fill-start)" />
                        <stop offset="100%" stopColor="var(--trend-fill-end)" />
                      </linearGradient>
                    </defs>
                    {trendPath ? <path d={`${trendPath} L 542 162 L 18 162 Z`} fill="url(#trendFill)" /> : null}
                    {trendPath ? (
                      <path d={trendPath} fill="none" stroke="var(--trend-stroke)" strokeWidth="3" strokeLinecap="round" />
                    ) : null}
                  </svg>
                ) : (
                  <p className="trend-empty mb-0">Trend graph will appear after your first logs this week.</p>
                )}
              </div>

              <div className="trend-label-row">
                {weeklyTrend.map((entry, index) => (
                  <div key={`${entry.label}-${index}`} className="trend-day">
                    <span className="trend-day-label">{entry.label}</span>
                    <span className="trend-day-score">{activeTrendConfig.formatter(entry[activeTrendMetric] || 0)}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="dashboard-activity">
            <div className="data-section-title logger-section-title">Logging Activity</div>
            <div className="logger-grid">
              <article className="logger-card">
                <header className="logger-head logger-workout">Workout Logger</header>
                <WorkoutLogger
                  user={user}
                  onWorkoutLogged={(delta) => {
                    applyOptimisticSummaryDelta(delta);
                    setRefreshKey((current) => current + 1);
                  }}
                />
              </article>
              <article className="logger-card">
                <header className="logger-head logger-meal">Meal Logger</header>
                <MealLogger
                  user={user}
                  onMealLogged={(delta) => {
                    applyOptimisticSummaryDelta(delta);
                    setRefreshKey((current) => current + 1);
                  }}
                />
              </article>
              <article className="logger-card">
                <header className="logger-head logger-biometrics">Biometrics</header>
                <HealthMetrics user={user} onMetricsSaved={() => setRefreshKey((current) => current + 1)} />
              </article>
            </div>
          </section>
        </div>
      </div>
    </Container>
  );
};

export default DataPage;