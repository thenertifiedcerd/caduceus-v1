import React, { useState } from 'react';
import { Form, Button, Row, Col, ListGroup, Card, Alert } from 'react-bootstrap';
import { Plus, Trash2, Search } from 'lucide-react';
import {
  searchFoodNutrition,
  calculateNutritionForPortion,
  calculateMealTotals,
  PORTION_SIZES,
} from '../utils/calorieEstimator';
import './forms.css';

const MealBuilder = ({ onMealBuilt, isDarkMode }) => {
  const [mealItems, setMealItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('grams');
  const [mealName, setMealName] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);

  const mealTotals = calculateMealTotals(mealItems);

  const handleSearch = async () => {
    if (searchTerm.trim().length < 2) return;

    setIsSearching(true);
    const results = await searchFoodNutrition(searchTerm);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleAddItem = () => {
    if (!selectedFood || !quantity) {
      alert('Select a food and enter a quantity');
      return;
    }

    const nutrition = calculateNutritionForPortion(selectedFood, parseFloat(quantity), unit);
    if (!nutrition) return;

    const newItem = {
      id: `${selectedFood.id}-${Date.now()}`,
      food: selectedFood,
      quantity: parseFloat(quantity),
      unit,
      nutrition,
    };

    setMealItems([...mealItems, newItem]);
    setSelectedFood(null);
    setQuantity('');
    setUnit('grams');
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleRemoveItem = (id) => {
    setMealItems(mealItems.filter((item) => item.id !== id));
  };

  const handleSaveMeal = () => {
    if (!mealName.trim()) {
      alert('Enter a meal name');
      return;
    }

    if (mealItems.length === 0) {
      alert('Add at least one food item');
      return;
    }

    const mealData = {
      name: mealName.trim(),
      items: mealItems,
      totals: mealTotals,
    };

    if (onMealBuilt) {
      onMealBuilt(mealData);
    }

    // Reset
    setMealName('');
    setMealItems([]);
    setShowBuilder(false);
  };

  if (!showBuilder) {
    return (
      <Button
        variant="outline-primary"
        size="sm"
        onClick={() => setShowBuilder(true)}
        className="mb-3"
      >
        <Plus size={16} className="me-2" /> Build Meal
      </Button>
    );
  }

  return (
    <Card
      className="mb-4"
      style={{
        backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
        borderColor: isDarkMode ? '#404040' : '#e0e0e0',
        color: isDarkMode ? '#e0e0e0' : '#000',
      }}
    >
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Build Your Meal</h5>
          <Button
            variant="text"
            size="sm"
            onClick={() => setShowBuilder(false)}
            className="text-muted"
          >
            ✕
          </Button>
        </div>

        {/* Meal Name */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-600 small text-uppercase">Meal Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="e.g., Breakfast, Lunch, Post-Workout..."
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            style={{
              backgroundColor: isDarkMode ? '#3a3a3a' : '#f5f5f5',
              borderColor: isDarkMode ? '#404040' : '#e0e0e0',
              color: isDarkMode ? '#e0e0e0' : '#000',
            }}
          />
        </Form.Group>

        {/* Food Search */}
        <div className="mb-4 p-3 rounded" style={{ backgroundColor: isDarkMode ? '#333' : '#f9f9f9' }}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-600 small text-uppercase">Search Food</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                placeholder="e.g., Chicken breast, Rice, Broccoli..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                style={{
                  backgroundColor: isDarkMode ? '#3a3a3a' : '#fff',
                  borderColor: isDarkMode ? '#404040' : '#e0e0e0',
                  color: isDarkMode ? '#e0e0e0' : '#000',
                }}
              />
              <Button variant="primary" onClick={handleSearch} disabled={isSearching}>
                {isSearching ? 'Searching...' : <Search size={18} />}
              </Button>
            </div>
          </Form.Group>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <ListGroup
              style={{
                backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
                borderColor: isDarkMode ? '#404040' : '#e0e0e0',
              }}
            >
              {searchResults.map((food) => (
                <ListGroup.Item
                  key={food.id}
                  action
                  onClick={() => {
                    setSelectedFood(food);
                    setSearchResults([]);
                  }}
                  style={{
                    backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
                    borderColor: isDarkMode ? '#404040' : '#e0e0e0',
                    color: isDarkMode ? '#e0e0e0' : '#000',
                    cursor: 'pointer',
                  }}
                >
                  <div className="fw-600">{food.name}</div>
                  <small className="text-muted">{food.brand}</small>
                  <div className="small mt-1">
                    {food.calories} cal | {food.protein}g protein | {food.carbs}g carbs | {food.fat}g fat
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}

          {/* Selected Food */}
          {selectedFood && (
            <Alert className="mt-3 mb-0" variant="info">
              <div className="fw-600">{selectedFood.name}</div>
              <small className="d-block mt-1">
                Per 100g: {selectedFood.calories} cal | {selectedFood.protein}g protein | {selectedFood.carbs}g carbs |
                {selectedFood.fat}g fat
              </small>
            </Alert>
          )}
        </div>

        {/* Quantity & Unit */}
        {selectedFood && (
          <div className="mb-4 p-3 rounded" style={{ backgroundColor: isDarkMode ? '#333' : '#f9f9f9' }}>
            <Row className="g-2">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label className="fw-600 small text-uppercase">Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="e.g., 150"
                    min={0}
                    step={0.1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    style={{
                      backgroundColor: isDarkMode ? '#3a3a3a' : '#fff',
                      borderColor: isDarkMode ? '#404040' : '#e0e0e0',
                      color: isDarkMode ? '#e0e0e0' : '#000',
                    }}
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label className="fw-600 small text-uppercase">Unit</Form.Label>
                  <Form.Select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    style={{
                      backgroundColor: isDarkMode ? '#3a3a3a' : '#fff',
                      borderColor: isDarkMode ? '#404040' : '#e0e0e0',
                      color: isDarkMode ? '#e0e0e0' : '#000',
                    }}
                  >
                    {Object.entries(PORTION_SIZES).map(([key, portionSize]) => (
                      <option key={key} value={key}>
                        {portionSize.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Button variant="success" onClick={handleAddItem} className="w-100 mt-3">
              <Plus size={16} className="me-2" /> Add to Meal
            </Button>
          </div>
        )}

        {/* Meal Items */}
        {mealItems.length > 0 && (
          <div className="mb-4">
            <h6 className="fw-600 text-uppercase mb-2">Items in Meal</h6>
            <ListGroup
              style={{
                backgroundColor: isDarkMode ? '#1a1a1a' : '#f9f9f9',
                borderColor: isDarkMode ? '#404040' : '#e0e0e0',
              }}
            >
              {mealItems.map((item) => (
                <ListGroup.Item
                  key={item.id}
                  style={{
                    backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
                    borderColor: isDarkMode ? '#404040' : '#d0d0d0',
                    color: isDarkMode ? '#e0e0e0' : '#000',
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="fw-600">{item.food.name}</div>
                      <small className="text-muted">
                        {item.quantity} {PORTION_SIZES[item.unit].label}
                      </small>
                      <div className="small mt-1">
                        <span className="me-3">
                          <strong>{item.nutrition.calories}</strong> cal
                        </span>
                        <span className="me-3">
                          <strong>{item.nutrition.protein}</strong>g protein
                        </span>
                        <span className="me-3">
                          <strong>{item.nutrition.carbs}</strong>g carbs
                        </span>
                        <span>
                          <strong>{item.nutrition.fat}</strong>g fat
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                      className="ms-2"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        )}

        {/* Meal Totals */}
        {mealItems.length > 0 && (
          <Card
            className="mb-4"
            style={{
              backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f8ff',
              borderColor: '#007bff',
              color: isDarkMode ? '#e0e0e0' : '#000',
            }}
          >
            <Card.Body>
              <h6 className="fw-600 text-uppercase mb-2">Total Estimated Nutrition</h6>
              <Row className="text-center">
                <Col xs={6} className="mb-2">
                  <div className="fw-600" style={{ fontSize: '1.2rem' }}>
                    {mealTotals.calories}
                  </div>
                  <small className="text-muted">Calories</small>
                </Col>
                <Col xs={6} className="mb-2">
                  <div className="fw-600" style={{ fontSize: '1.2rem' }}>
                    {mealTotals.protein}g
                  </div>
                  <small className="text-muted">Protein</small>
                </Col>
                <Col xs={6}>
                  <div className="fw-600" style={{ fontSize: '1.2rem' }}>
                    {mealTotals.carbs}g
                  </div>
                  <small className="text-muted">Carbs</small>
                </Col>
                <Col xs={6}>
                  <div className="fw-600" style={{ fontSize: '1.2rem' }}>
                    {mealTotals.fat}g
                  </div>
                  <small className="text-muted">Fat</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Save Meal Button */}
        {mealItems.length > 0 && (
          <Button
            variant="primary"
            onClick={handleSaveMeal}
            className="w-100"
            disabled={!mealName.trim()}
          >
            Save Meal
          </Button>
        )}
      </Card.Body>
    </Card>
  );
};

export default MealBuilder;
