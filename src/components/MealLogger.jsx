import React, { useEffect, useState, useContext } from 'react';
import { ListGroup } from 'react-bootstrap';
import { Plus } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ThemeContext } from '../ThemeContext';
import MealBuilder from './MealBuilder';
import './forms.css';

const MealLogger = ({ user, onMealLogged }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const abortController = new AbortController();

    const fetchFoodSuggestions = async () => {
      if (searchTerm.trim().length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerm)}&search_simple=1&action=process&json=1&page_size=5`,
          { signal: abortController.signal }
        );

        const data = await response.json();
        const foods = (data.products || []).map((product) => ({
          name: product.product_name || product.generic_name || 'Unknown food',
          calories: Number(product.nutriments?.['energy-kcal_100g'] || 0),
          protein: Number(product.nutriments?.proteins_100g || 0),
          carbs: Number(product.nutriments?.carbohydrates_100g || 0),
          fat: Number(product.nutriments?.fat_100g || 0),
        }));

        setSuggestions(foods.filter((food) => food.name && food.name !== 'Unknown food'));
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Food search error:', error);
        }
      }
    };

    fetchFoodSuggestions();

    return () => abortController.abort();
  }, [searchTerm]);

  const handleSelectSuggestion = (food) => {
    setMealName(food.name);
    setSearchTerm(food.name);
    setCalories(food.calories ? String(food.calories) : '');
    setProtein(food.protein ? String(food.protein) : '');
    setCarbs(food.carbs ? String(food.carbs) : '');
    setFat(food.fat ? String(food.fat) : '');
    setSuggestions([]);
  };

  const handleSaveMeal = async (event) => {
    event.preventDefault();
    setSaveMessage('');

    if (!user?.uid) {
      setSaveMessage('You need to be logged in to save meals.');
      return;
    }

    if (!mealName.trim()) {
      setSaveMessage('Please enter a meal name.');
      return;
    }

    setIsSaving(true);

    try {
      await addDoc(collection(db, 'meal_logs'), {
        uid: user.uid,
        mealName: mealName.trim(),
        calories: calories ? Number(calories) : 0,
        proteinG: protein ? Number(protein) : 0,
        carbsG: carbs ? Number(carbs) : 0,
        fatG: fat ? Number(fat) : 0,
        createdAt: serverTimestamp(),
      });

      setSaveMessage('Meal saved.');
      setSearchTerm('');
      setMealName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setSuggestions([]);

      if (onMealLogged) {
        onMealLogged();
      }
    } catch (error) {
      console.error('Error saving meal:', error);
      setSaveMessage('Could not save meal. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMealBuilt = async (mealData) => {
    setSaveMessage('');

    if (!user?.uid) {
      setSaveMessage('You need to be logged in to save meals.');
      return;
    }

    setIsSaving(true);

    try {
      const { name, totals } = mealData;

      await addDoc(collection(db, 'meal_logs'), {
        uid: user.uid,
        mealName: name,
        calories: totals.calories,
        proteinG: totals.protein,
        carbsG: totals.carbs,
        fatG: totals.fat,
        fiberG: totals.fiber,
        isBuilt: true,
        createdAt: serverTimestamp(),
      });

      setSaveMessage('Meal built and saved.');
      setSearchTerm('');
      setMealName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setSuggestions([]);

      if (onMealLogged) {
        onMealLogged();
      }
    } catch (error) {
      console.error('Error saving built meal:', error);
      setSaveMessage('Could not save meal. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      color: isDarkMode ? '#e0e0e0' : '#000'
    }}>
      <div className="p-4">
        <MealBuilder 
          onMealBuilt={handleMealBuilt} 
          isDarkMode={isDarkMode}
        />

        <hr style={{ borderColor: isDarkMode ? '#404040' : '#d0d0d0' }} />
        
        <h6 className="fw-600 text-uppercase mb-3">Quick Entry</h6>

        <form onSubmit={handleSaveMeal} style={{ display: isDarkMode ? 'block' : 'block' }} className={isDarkMode ? 'dark-mode' : ''}>
          <div className="form-input-group position-relative">
            <label className={isDarkMode ? 'dark-mode' : ''}>Search Meal (OpenFoodFacts)</label>
            <div className="form-input-wrapper">
            <input
              type="text"
              placeholder="e.g. Greek yogurt, Chicken breast..."
              value={searchTerm}
              onChange={(event) => {
                const value = event.target.value;
                setSearchTerm(value);
                setMealName(value);
              }}
              style={{ position: 'relative', zIndex: 10 }}
            />
            </div>

            {suggestions.length > 0 ? (
              <ListGroup className="position-absolute w-100 shadow-lg mt-1" style={{ zIndex: 1000 }}>
                {suggestions.map((food, index) => (
                  <ListGroup.Item 
                    key={`${food.name}-${index}`} 
                    action 
                    onClick={() => handleSelectSuggestion(food)}
                    style={{
                      backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
                      borderColor: isDarkMode ? '#404040' : '#e0e0e0',
                      color: isDarkMode ? '#e0e0e0' : '#000'
                    }}
                  >
                    {food.name}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            ) : null}
          </div>

          <div className="form-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="form-input-group">
              <label>Calories</label>
              <div className="form-input-wrapper">
                <input 
                  type="number" 
                  placeholder="0" 
                  min={0} 
                  value={calories} 
                  onChange={(e) => setCalories(e.target.value)}
                />
              </div>
            </div>
            <div className="form-input-group">
              <label>Protein (g)</label>
              <div className="form-input-wrapper">
                <input 
                  type="number" 
                  placeholder="0" 
                  min={0} 
                  value={protein} 
                  onChange={(e) => setProtein(e.target.value)}
                />
              </div>
            </div>
            <div className="form-input-group">
              <label>Carbs (g)</label>
              <div className="form-input-wrapper">
                <input 
                  type="number" 
                  placeholder="0" 
                  min={0} 
                  value={carbs} 
                  onChange={(e) => setCarbs(e.target.value)}
                />
              </div>
            </div>
            <div className="form-input-group">
              <label>Fat (g)</label>
              <div className="form-input-wrapper">
                <input 
                  type="number" 
                  placeholder="0" 
                  min={0} 
                  value={fat} 
                  onChange={(e) => setFat(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button className="form-btn form-btn-primary w-100" type="submit" disabled={isSaving}>
            <Plus size={18} className="me-2" />
            {isSaving ? 'Saving Meal...' : 'Save Meal'}
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

export default MealLogger;
