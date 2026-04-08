import React, { useState, useContext } from 'react';
import { ListGroup } from 'react-bootstrap';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ThemeContext } from '../ThemeContext';
import './forms.css';

// Biometric info goes here

const HealthMetrics = ({ user, onMetricsSaved }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [age, setAge] = useState('21');
  const [heightCm, setHeightCm] = useState('180');
  const [weightKg, setWeightKg] = useState('');
  const [healthRecords, setHealthRecords] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

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
      await addDoc(collection(db, 'body_metrics'), {
        uid: user.uid,
        age: age ? Number(age) : null,
        heightCm: heightCm ? Number(heightCm) : null,
        weightKg: Number(weightKg),
        notes: healthRecords.trim() || '',
        createdAt: serverTimestamp(),
      });

      setSaveMessage('Biometric entry saved.');
      setHealthRecords('');

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
              <div className="form-input-wrapper">
                <input 
                  type="number" 
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