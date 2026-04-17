import React, { useEffect, useState, useContext } from 'react';
import { addDoc, collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { ThemeContext } from '../ThemeContext';
import './forms.css';

const YEARS_IN_MS = 365.2425 * 24 * 60 * 60 * 1000;

const getTimestampMs = (value) => {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const getSavedAge = (ageYears, ageRecordedAt) => {
  const baselineAge = Number(ageYears);

  if (!Number.isFinite(baselineAge)) {
    return '';
  }

  const recordedAtMs = getTimestampMs(ageRecordedAt);
  if (!recordedAtMs) {
    return baselineAge.toFixed(1).replace(/\.0$/, '');
  }

  const currentAge = baselineAge + (Date.now() - recordedAtMs) / YEARS_IN_MS;
  return currentAge.toFixed(1).replace(/\.0$/, '');
};

const pickLatestRecord = (records) => {
  return records
    .filter((record) => record && Number.isFinite(getTimestampMs(record.timestamp)))
    .sort((left, right) => getTimestampMs(left.timestamp) - getTimestampMs(right.timestamp))[records.length - 1] || null;
};

const HealthMetrics = ({ user, onMetricsSaved }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [healthRecords, setHealthRecords] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadSavedMetrics = async () => {
      if (!user?.uid) {
        setAge('');
        setHeightCm('');
        setWeightKg('');
        setHealthRecords('');
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const latestMetricsQuery = query(
          collection(db, 'body_metrics'),
          where('uid', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(1)
        );

        const [userDocSnap, latestMetricsSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('__name__', '==', user.uid))),
          getDocs(latestMetricsQuery),
        ]);

        const userDocData = userDocSnap.docs[0]?.data() || {};
        const profile = userDocData.biometricProfile || {};
        const latestMetricData = latestMetricsSnap.docs[0]?.data() || {};

        const profileTimestamp = getTimestampMs(profile.updatedAt || profile.ageRecordedAt);
        const metricTimestamp = getTimestampMs(latestMetricData.createdAt);

        const source = profileTimestamp >= metricTimestamp ? profile : latestMetricData;
        const sourceAge = getSavedAge(source.ageYears ?? source.age, source.ageRecordedAt || source.createdAt || source.updatedAt);

        if (!cancelled) {
          setAge(sourceAge);
          setHeightCm(source.heightCm != null ? String(source.heightCm) : '');
          setWeightKg(source.weightKg != null ? String(source.weightKg) : '');
          setHealthRecords(source.notes || '');
        }

        if (!profileTimestamp && metricTimestamp && latestMetricData.uid === user.uid) {
          await setDoc(
            userDocRef,
            {
              uid: user.uid,
              email: user.email || null,
              displayName: user.displayName || null,
              photoURL: user.photoURL || null,
              biometricProfile: {
                ageYears: latestMetricData.age ?? latestMetricData.ageYears ?? null,
                ageRecordedAt: latestMetricData.createdAt || serverTimestamp(),
                heightCm: latestMetricData.heightCm ?? null,
                weightKg: latestMetricData.weightKg ?? null,
                notes: latestMetricData.notes || '',
              },
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      } catch (error) {
        console.error('Error loading saved biometrics:', error);
      }
    };

    loadSavedMetrics();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.email, user?.displayName, user?.photoURL]);

  const handleSaveMetrics = async (event) => {
    event.preventDefault();
    setSaveMessage('');

    if (!user?.uid) {
      setSaveMessage('You need to be logged in to save metrics.');
      return;
    }

    if (!weightKg) {
      setSaveMessage('Please enter your current weight.');
      return;
    }

    setIsSaving(true);

    try {
      const parsedAge = age ? Number(age) : null;
      const parsedHeight = heightCm ? Number(heightCm) : null;
      const parsedWeight = Number(weightKg);
      const notes = healthRecords.trim() || '';

      const batch = writeBatch(db);
      const metricRef = doc(collection(db, 'body_metrics'));
      const userDocRef = doc(db, 'users', user.uid);

      batch.set(metricRef, {
        uid: user.uid,
        ageYears: parsedAge,
        ageRecordedAt: new Date(),
        heightCm: parsedHeight,
        weightKg: parsedWeight,
        notes,
        createdAt: serverTimestamp(),
      });

      batch.set(
        userDocRef,
        {
          uid: user.uid,
          email: user.email || null,
          displayName: user.displayName || null,
          photoURL: user.photoURL || null,
          biometricProfile: {
            ageYears: parsedAge,
            ageRecordedAt: new Date(),
            heightCm: parsedHeight,
            weightKg: parsedWeight,
            notes,
          },
          updatedAt: serverTimestamp(),
          biometricUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await batch.commit();

      setAge(getSavedAge(parsedAge, new Date()));
      setHeightCm(parsedHeight != null ? String(parsedHeight) : '');
      setWeightKg(String(parsedWeight));
      setHealthRecords(notes);
      setSaveMessage('Biometric entry saved and account profile updated.');

      if (onMetricsSaved) {
        onMetricsSaved();
      }
    } catch (error) {
      console.error('Error saving metrics:', error);
      setSaveMessage('Could not save metrics. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ 
      color: isDarkMode ? '#e0e0e0' : '#000'
    }} className={isDarkMode ? 'dark-mode' : ''}>
      <div className="p-4">
        <form onSubmit={handleSaveMetrics}>
          <div className="form-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="form-input-group">
              <label>Age</label>
              <div className="form-helper-text">This value is stored with a timestamp so it keeps aging with your account.</div>
              <div className="form-input-wrapper">
                <input 
                  type="number" 
                  step="0.1"
                  min="0"
                  value={age} 
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
            </div>
            <div className="form-input-group">
              <label>Height (cm)</label>
              <div className="form-input-wrapper">
                <input 
                  type="number" 
                  value={heightCm} 
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="form-input-group">
            <label>Current Weight (kg)</label>
            <div className="form-input-wrapper">
              <input 
                type="number" 
                step="0.1" 
                placeholder="75.5"
                value={weightKg} 
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
          </div>

          <div className="form-input-group">
            <label>Health Notes</label>
            <div className="form-input-wrapper">
              <textarea 
                rows={3} 
                placeholder="Any relevant health information..."
                value={healthRecords} 
                onChange={(e) => setHealthRecords(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          <button className="form-btn form-btn-primary w-100" type="submit" disabled={isSaving} style={{ marginTop: '1rem' }}>
            {isSaving ? 'Saving Biometrics...' : 'Save Biometrics'}
          </button>

          <div className="form-helper-text" style={{ marginTop: '0.85rem' }}>
            Saved to this account and restored automatically next time you sign in.
          </div>

          {saveMessage ? (
            <div className={`form-message ${saveMessage.includes('saved') ? 'form-message-success' : 'form-message-error'}`}>
              ✓ {saveMessage}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
};

export default HealthMetrics;