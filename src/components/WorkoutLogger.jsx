import React, { useState, useEffect, useContext } from 'react';
import { ListGroup } from 'react-bootstrap';
import { Plus } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ThemeContext } from '../ThemeContext';
import './forms.css';

const WorkoutLogger = ({ user, onWorkoutLogged }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [workoutMode, setWorkoutMode] = useState('reps');
  const [reps, setReps] = useState('');
  const [sets, setSets] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (searchTerm.length > 2) {
      fetch(`https://wger.de/api/v2/exercise/search/?term=${searchTerm}`)
        .then(res => res.json())
        .then(data => setSuggestions(data.suggestions || []))
        .catch(err => console.error(err));
    } else {
      setSuggestions([]);
    }
  }, [searchTerm]);

  const handleSaveWorkout = async (event) => {
    event.preventDefault();
    setSaveMessage('');

    if (!user?.uid) {
      setSaveMessage('You need to be logged in to save workouts.');
      return;
    }

    if (!searchTerm.trim()) {
      setSaveMessage('Please enter an exercise.');
      return;
    }

    if (workoutMode === 'reps' && (!reps || !sets)) {
      setSaveMessage('Please enter reps and sets for this workout.');
      return;
    }

    if (workoutMode === 'duration' && !durationSeconds) {
      setSaveMessage('Please enter duration in seconds for this workout.');
      return;
    }

    setIsSaving(true);

    try {
      await addDoc(collection(db, 'workout_logs'), {
        uid: user.uid,
        exerciseName: searchTerm.trim(),
        trackingMode: workoutMode,
        reps: workoutMode === 'reps' ? Number(reps) : null,
        sets: workoutMode === 'reps' ? Number(sets) : null,
        durationSeconds: workoutMode === 'duration' ? Number(durationSeconds) : null,
        createdAt: serverTimestamp(),
      });

      setSaveMessage('Workout saved.');
      setReps('');
      setSets('');
      setDurationSeconds('');
      setSearchTerm('');
      setSuggestions([]);

      if (onWorkoutLogged) {
        onWorkoutLogged();
      }
    } catch (error) {
      console.error('Error saving workout:', error);
      setSaveMessage('Could not save workout. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ 
      color: isDarkMode ? '#e0e0e0' : '#000'
    }}>
      <div className="p-4">
        <form onSubmit={handleSaveWorkout} className={isDarkMode ? 'dark-mode' : ''}>
          <div className="form-input-group">
            <label>Tracking Type</label>
            <div className="form-input-wrapper">
            <select
              value={workoutMode}
              onChange={(e) => {
                const nextMode = e.target.value;
                setWorkoutMode(nextMode);

                if (nextMode === 'reps') {
                  setDurationSeconds('');
                } else {
                  setReps('');
                  setSets('');
                }
              }}
            >
              <option value="reps">Reps + Sets</option>
              <option value="duration">Timed (seconds)</option>
            </select>
            </div>
          </div>

          <div className="form-input-group position-relative">
            <label>Search Exercise</label>
            <div className="form-input-wrapper">
            <input 
              type="text" 
              placeholder="e.g. Pull-ups, Bench Press, Squats..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            </div>
            
            {suggestions.length > 0 && (
              <ListGroup className="position-absolute w-100 shadow-lg mt-1" style={{ zIndex: 1000 }}>
                {suggestions.map((item, index) => (
                  <ListGroup.Item 
                    key={index} 
                    action 
                    onClick={() => {
                      setSearchTerm(item.value);
                      setSuggestions([]);
                    }}
                    style={{
                      backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
                      borderColor: isDarkMode ? '#404040' : '#e0e0e0',
                      color: isDarkMode ? '#e0e0e0' : '#000'
                    }}
                  >
                    {item.value}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </div>

          {workoutMode === 'reps' ? (
            <div className="form-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div className="form-input-group">
                <label>Reps</label>
                <div className="form-input-wrapper">
                <input
                  type="number"
                  placeholder="10"
                  value={reps}
                  min={1}
                  onChange={(e) => setReps(e.target.value)}
                />
                </div>
              </div>
              <div className="form-input-group">
                <label>Sets</label>
                <div className="form-input-wrapper">
                <input
                  type="number"
                  placeholder="3"
                  value={sets}
                  min={1}
                  onChange={(e) => setSets(e.target.value)}
                />
                </div>
              </div>
            </div>
          ) : (
            <div className="form-input-group">
              <label>Duration (seconds)</label>
              <div className="form-input-wrapper">
              <input
                type="number"
                placeholder="60"
                value={durationSeconds}
                min={1}
                onChange={(e) => setDurationSeconds(e.target.value)}
              />
              </div>
            </div>
          )}
          
          <button className="form-btn form-btn-primary w-100" type="submit" disabled={isSaving} style={{ marginTop: '1rem' }}>
            <Plus size={18} className="me-2" />
            {isSaving ? 'Saving Workout...' : 'Save Workout'}
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

export default WorkoutLogger;