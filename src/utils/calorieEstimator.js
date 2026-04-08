/**
 * Calorie estimator and meal builder utilities
 */

import { fetchOpenFoodFactsSearch } from './openFoodFacts';

export const PORTION_SIZES = {
  grams: { label: 'grams (g)', multiplier: 1 },
  ounces: { label: 'ounces (oz)', multiplier: 28.35 },
  cups: { label: 'cups', multiplier: 240 },
  tablespoons: { label: 'tablespoons (tbsp)', multiplier: 15 },
  teaspoons: { label: 'teaspoons (tsp)', multiplier: 5 },
  serving: { label: 'serving', multiplier: 100 },
};

export const searchFoodNutrition = async (foodName) => {
  const data = await fetchOpenFoodFactsSearch({
    search_terms: foodName,
    fields: 'code,product_name,brands,nutriments',
    page_size: '10',
  });

  const foods = (data.products || [])
    .filter((product) => product.product_name)
    .map((product) => ({
      id: product.id || product.code,
      name: product.product_name,
      brand: product.brands || '',
      calories: Number(product.nutriments?.['energy-kcal_100g'] || 0),
      protein: Number(product.nutriments?.proteins_100g || 0),
      carbs: Number(product.nutriments?.carbohydrates_100g || 0),
      fat: Number(product.nutriments?.fat_100g || 0),
      fiber: Number(product.nutriments?.fiber_100g || 0),
    }));

  return foods.slice(0, 8);
};

/**
 * Calculate nutrition for a portion of food
 * @param {Object} food - Food object with per 100g values
 * @param {number} quantity - Quantity in the specified unit
 * @param {string} unit - Unit of measurement (grams, cups, serving, etc)
 * @returns {Object} Calculated nutrition values
 */
export const calculateNutritionForPortion = (food, quantity, unit = 'grams') => {
  const portion = PORTION_SIZES[unit];
  if (!portion) {
    console.error(`Unknown unit: ${unit}`);
    return null;
  }

  // Convert to grams
  const gramsTotal = quantity * portion.multiplier;

  // Calculate values (food values are per 100g)
  const multiplier = gramsTotal / 100;

  return {
    calories: Math.round(food.calories * multiplier),
    protein: Math.round(food.protein * multiplier * 10) / 10,
    carbs: Math.round(food.carbs * multiplier * 10) / 10,
    fat: Math.round(food.fat * multiplier * 10) / 10,
    fiber: Math.round(food.fiber * multiplier * 10) / 10,
    gramsTotal: Math.round(gramsTotal),
  };
};

/**
 * Calculate totals for a meal (array of food items)
 * @param {Array} mealItems - Array of {food, quantity, unit}
 * @returns {Object} Total nutrition for the meal
 */
export const calculateMealTotals = (mealItems) => {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    itemCount: 0,
  };

  mealItems.forEach((item) => {
    if (!item.food || !item.quantity) return;

    const nutrition = calculateNutritionForPortion(item.food, item.quantity, item.unit || 'grams');
    if (!nutrition) return;

    totals.calories += nutrition.calories;
    totals.protein += nutrition.protein;
    totals.carbs += nutrition.carbs;
    totals.fat += nutrition.fat;
    totals.fiber += nutrition.fiber;
    totals.itemCount += 1;
  });

  // Round final totals
  totals.protein = Math.round(totals.protein * 10) / 10;
  totals.carbs = Math.round(totals.carbs * 10) / 10;
  totals.fat = Math.round(totals.fat * 10) / 10;
  totals.fiber = Math.round(totals.fiber * 10) / 10;

  return totals;
};

/**
 * Estimate daily macro targets based on body weight and activity level
 * @param {number} weightKg - Body weight in kg
 * @param {string} activityLevel - 'sedentary', 'light', 'moderate', 'active', 'very_active'
 * @returns {Object} Estimated daily calorie and macro targets
 */
export const estimateDailyTargets = (weightKg, activityLevel = 'moderate') => {
  // Base metabolic rate using Mifflin-St Jeor (assume average person)
  const bmr = 10 * weightKg + 6.25 * 170 - 5 * 30 + 5; // simplified for avg person

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);

  return {
    dailyCalories: Math.round(tdee),
    protein: Math.round((tdee * 0.3) / 4), // 30% of calories, 4 cal/g
    carbs: Math.round((tdee * 0.45) / 4), // 45% of calories, 4 cal/g
    fat: Math.round((tdee * 0.25) / 9), // 25% of calories, 9 cal/g
  };
};
