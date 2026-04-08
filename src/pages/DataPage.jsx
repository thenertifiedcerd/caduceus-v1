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

const OPTIMISTIC_DELTA_TTL_MS = 15000;

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
      workoutsLogged: current.workoutsLogged + safeDelta.workoutsLogged,
      mealsLogged: current.mealsLogged + safeDelta.mealsLogged,
      weeklyCalories: current.weeklyCalories + safeDelta.weeklyCalories,
    }));

    // Automatically remove temporary optimistic contribution after a short window.
    setTimeout(() => {
      setOptimisticSummaryDelta((current) => ({
        workoutsLogged: Math.max(0, current.workoutsLogged - safeDelta.workoutsLogged),
        mealsLogged: Math.max(0, current.mealsLogged - safeDelta.mealsLogged),
        weeklyCalories: Math.max(0, current.weeklyCalories - safeDelta.weeklyCalories),
      }));
    }, OPTIMISTIC_DELTA_TTL_MS);
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

        const nextSummary = {
          periodDays: 7,
          workoutsLogged,
          mealsLogged,
          weeklyCalories,
          latestWeightKg,
          weeklyWeightDeltaKg,
          consistencyScore,
        };

        setWeeklySummary(nextSummary);

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
        setSummaryError('Could not load weekly trends yet. Keep logging and try again.');
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
            {summaryError ? <p className="text-danger mb-3">{summaryError}</p> : null}

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