import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../client/AuthClient';
import './Search.css';

const Search = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [cookingTime, setCookingTime] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Состояния для автодополнения ингредиентов
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);

  // Состояния для модального окна рецепта
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeDetails, setRecipeDetails] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);

  useEffect(() => {
    loadFilterData();
    checkCurrentUser();
    
    // Закрытие подсказок при клике вне компонента
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkCurrentUser = async () => {
    try {
      // Получаем текущую сессию
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setCurrentUser(session.user);
        
        // Загружаем профиль текущего пользователя
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!error && profile) {
          setCurrentProfile(profile);
          console.log('Current profile loaded:', profile);
        }
      }
    } catch (error) {
      console.error('Error checking current user:', error);
    }
  };

  const loadFilterData = async () => {
    try {
      // Загрузка категорий
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (!categoriesError) {
        setCategories(categoriesData || []);
      }

      // Загрузка кухонь
      const { data: cuisinesData, error: cuisinesError } = await supabase
        .from('cuisines')
        .select('*')
        .order('name');

      if (!cuisinesError) {
        setCuisines(cuisinesData || []);
      }

      // Загрузка популярных ингредиентов
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('*')
        .order('name')
        .limit(20);

      if (!ingredientsError) {
        setIngredients(ingredientsData || []);
      }

    } catch (error) {
      console.error('Error loading filter data:', error);
    }
  };

  // Загрузка полной информации о рецепте для модального окна
  const loadRecipeDetails = async (recipeId) => {
    try {
      setModalLoading(true);

      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          profiles!author_id (username, full_name, avatar_url),
          categories!category_id (name, description),
          recipe_cuisines (
            cuisines (name, country_code)
          ),
          ratings (
            rating,
            comment,
            created_at,
            profiles (username, avatar_url)
          ),
          recipe_ingredients (
            quantity,
            unit,
            notes,
            ingredients (name, description)
          ),
          cooking_steps (
            step_number,
            instruction,
            image_url,
            duration
          ),
          favorites (user_id),
          recipe_tags (
            tags (name, color)
          )
        `)
        .eq('id', recipeId)
        .eq('is_published', true)
        .single();

      if (error) throw error;

      if (data) {
        setRecipeDetails(data);
        
        // Проверяем, добавлен ли рецепт в избранное текущим пользователем
        if (currentProfile) {
          checkIfFavorite(recipeId, currentProfile.id);
        }
      }
    } catch (error) {
      console.error('Error loading recipe details:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const checkIfFavorite = async (recipeId, profileId) => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('recipe_id', recipeId)
        .eq('user_id', profileId)
        .single();

      if (!error && data) {
        setIsFavorite(true);
      } else {
        setIsFavorite(false);
      }
    } catch (error) {
      setIsFavorite(false);
    }
  };

  const toggleFavorite = async () => {
    if (!currentProfile) {
      alert('Войдите в систему, чтобы добавлять рецепты в избранное');
      return;
    }

    if (!selectedRecipe) return;

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('recipe_id', selectedRecipe.id)
          .eq('user_id', currentProfile.id);

        if (!error) {
          setIsFavorite(false);
          console.log('Removed from favorites');
        } else {
          console.error('Error removing from favorites:', error);
        }
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            recipe_id: selectedRecipe.id,
            user_id: currentProfile.id
          });

        if (!error) {
          setIsFavorite(true);
          console.log('Added to favorites');
        } else {
          console.error('Error adding to favorites:', error);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Ошибка при обновлении избранного');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleRecipeClick = async (recipe) => {
    setSelectedRecipe(recipe);
    await loadRecipeDetails(recipe.id);
  };

  const closeModal = () => {
    setSelectedRecipe(null);
    setRecipeDetails(null);
    setIsFavorite(false);
  };

  // Поиск ингредиентов для автодополнения
  const searchIngredients = async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(10);

      if (!error && data) {
        setSuggestions(data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error searching ingredients:', error);
    }
  };

  const handleIngredientSearchChange = (e) => {
    const value = e.target.value;
    setIngredientSearch(value);
    searchIngredients(value);
  };

  const addIngredient = (ingredient) => {
    if (!selectedIngredients.find(item => item.id === ingredient.id)) {
      setSelectedIngredients(prev => [...prev, ingredient]);
    }
    setIngredientSearch('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const removeIngredient = (ingredientId) => {
    setSelectedIngredients(prev => prev.filter(item => item.id !== ingredientId));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setHasSearched(true);

    try {
      let query = supabase
        .from('recipes')
        .select(`
          *,
          profiles!author_id (username, full_name),
          categories!category_id (name, description),
          recipe_cuisines (
            cuisines (name, country_code)
          ),
          ratings (rating),
          recipe_ingredients (
            quantity,
            unit,
            notes,
            ingredients (name, description)
          )
        `)
        .eq('is_published', true);

      // Поиск по названию и описанию
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Фильтр по категории
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      // Фильтр по сложности
      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      // Фильтр по времени приготовления
      if (cookingTime) {
        const time = parseInt(cookingTime);
        query = query.lte('preparation_time', time);
      }

      // Фильтр по кухне
      if (selectedCuisine) {
        query = query.eq('recipe_cuisines.cuisine_id', selectedCuisine);
      }

      // Фильтр по ингредиентам
      if (selectedIngredients.length > 0) {
        const ingredientIds = selectedIngredients.map(ing => ing.id);
        
        const { data: recipeIngredients } = await supabase
          .from('recipe_ingredients')
          .select('recipe_id')
          .in('ingredient_id', ingredientIds);

        if (recipeIngredients && recipeIngredients.length > 0) {
          const recipeIds = [...new Set(recipeIngredients.map(item => item.recipe_id))];
          query = query.in('id', recipeIds);
        } else {
          setRecipes([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Search error:', error);
        setRecipes([]);
      } else {
        const processedRecipes = (data || []).map(recipe => {
          const avgRating = recipe.ratings && recipe.ratings.length > 0 
            ? recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length
            : null;

          const cuisine = recipe.recipe_cuisines?.[0]?.cuisines;
          const mainIngredients = recipe.recipe_ingredients?.slice(0, 3) || [];

          return {
            ...recipe,
            average_rating: avgRating,
            cuisine: cuisine,
            main_ingredients: mainIngredients,
            total_time: recipe.preparation_time + (recipe.cooking_time || 0)
          };
        });

        setRecipes(processedRecipes);
      }
    } catch (error) {
      console.error('Search error:', error);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearch = async (term) => {
    setSearchTerm(term);
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          profiles!author_id (username),
          categories!category_id (name),
          recipe_cuisines (cuisines (name))
        `)
        .eq('is_published', true)
        .or(`title.ilike.%${term}%,description.ilike.%${term}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setRecipes(data);
        setHasSearched(true);
      }
    } catch (error) {
      console.error('Quick search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedCuisine('');
    setDifficulty('');
    setCookingTime('');
    setSelectedIngredients([]);
    setIngredientSearch('');
    setRecipes([]);
    setHasSearched(false);
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours} ч ${mins} мин`;
    }
    return `${mins} мин`;
  };

  const getAverageRating = (ratings) => {
    if (!ratings || ratings.length === 0) return 0;
    return ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  };

  const PopularSearches = () => (
    <div className="popular-searches">
      <h3>Популярные запросы:</h3>
      <div className="quick-search-tags">
        {['Паста', 'Салат', 'Десерт', 'Курица', 'Супы', 'Выпечка'].map(term => (
          <button
            key={term}
            className="quick-search-tag"
            onClick={() => handleQuickSearch(term)}
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="search-page">
      <div className="search-container">
        {/* Поисковая форма */}
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <input
              type="text"
              placeholder="Поиск рецептов по названию, ингредиентам..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button" disabled={loading}>
              {loading ? '⏳' : '🔍'} Поиск
            </button>
          </div>
        </form>

        {!hasSearched && <PopularSearches />}

        {/* Фильтры */}
        <div className="filters-section">
          <div className="filters-header">
            <h3>Фильтры</h3>
            <button type="button" onClick={clearFilters} className="clear-filters">
              Очистить все
            </button>
          </div>

          <div className="filters-grid">
            <div className="filter-group">
              <label>Категория</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Все категории</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Кухня</label>
              <select 
                value={selectedCuisine} 
                onChange={(e) => setSelectedCuisine(e.target.value)}
              >
                <option value="">Все кухни</option>
                {cuisines.map(cuisine => (
                  <option key={cuisine.id} value={cuisine.id}>{cuisine.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Сложность</label>
              <select 
                value={difficulty} 
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="">Любая</option>
                <option value="easy">Легкая</option>
                <option value="medium">Средняя</option>
                <option value="hard">Сложная</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Время приготовления</label>
              <select 
                value={cookingTime} 
                onChange={(e) => setCookingTime(e.target.value)}
              >
                <option value="">Любое</option>
                <option value="15">До 15 мин</option>
                <option value="30">До 30 мин</option>
                <option value="60">До 60 мин</option>
                <option value="120">Более 60 мин</option>
              </select>
            </div>
          </div>

          {/* Ингредиенты с автодополнением */}
          <div className="ingredients-filter">
            <h4>Ингредиенты</h4>
            
            {/* Поле поиска ингредиентов */}
            <div className="ingredient-search-container" ref={suggestionsRef}>
              <div className="ingredient-input-wrapper">
                <input
                  type="text"
                  placeholder="Начните вводить название ингредиента..."
                  value={ingredientSearch}
                  onChange={handleIngredientSearchChange}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  className="ingredient-search-input"
                />
                
                {/* Подсказки */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {suggestions.map(ingredient => (
                      <div
                        key={ingredient.id}
                        className="suggestion-item"
                        onClick={() => addIngredient(ingredient)}
                      >
                        <span className="suggestion-name">{ingredient.name}</span>
                        {ingredient.description && (
                          <span className="suggestion-description">
                            {ingredient.description}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Выбранные ингредиенты */}
            <div className="selected-ingredients">
              {selectedIngredients.map(ingredient => (
                <div key={ingredient.id} className="selected-ingredient-tag">
                  <span>{ingredient.name}</span>
                  <button
                    type="button"
                    onClick={() => removeIngredient(ingredient.id)}
                    className="remove-ingredient"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Популярные ингредиенты */}
            {selectedIngredients.length === 0 && (
              <div className="popular-ingredients">
                <p>Популярные ингредиенты:</p>
                <div className="popular-ingredients-list">
                  {ingredients.slice(0, 8).map(ingredient => (
                    <button
                      key={ingredient.id}
                      type="button"
                      className="popular-ingredient-tag"
                      onClick={() => addIngredient(ingredient)}
                    >
                      {ingredient.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Результаты поиска */}
        <div className="search-results">
          {hasSearched && (
            <div className="results-header">
              <h2>Найдено рецептов: {recipes.length}</h2>
              {searchTerm && (
                <p>Результаты поиска по запросу: "{searchTerm}"</p>
              )}
              {selectedIngredients.length > 0 && (
                <p>С ингредиентами: {selectedIngredients.map(ing => ing.name).join(', ')}</p>
              )}
            </div>
          )}
          
          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Поиск рецептов...</p>
            </div>
          ) : (
            <div className="recipes-list">
              {recipes.length === 0 && hasSearched ? (
                <div className="no-results">
                  <h3>Рецепты не найдены</h3>
                  <p>Попробуйте изменить параметры поиска или фильтры</p>
                  <button onClick={clearFilters} className="cta-button">
                    Сбросить фильтры
                  </button>
                </div>
              ) : (
                recipes.map(recipe => (
                  <div 
                    key={recipe.id} 
                    className="recipe-card"
                    onClick={() => handleRecipeClick(recipe)}
                  >
                    <div className="recipe-image">
                      {recipe.image_url ? (
                        <img src={recipe.image_url} alt={recipe.title} />
                      ) : (
                        <div className="recipe-image-placeholder">
                          🍳
                        </div>
                      )}
                    </div>
                    
                    <div className="recipe-content">
                      <div className="recipe-header">
                        <h3>{recipe.title}</h3>
                        {recipe.average_rating && (
                          <div className="recipe-rating">
                            ⭐ {recipe.average_rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                      
                      <p className="recipe-description">{recipe.description}</p>
                      
                      <div className="recipe-meta">
                        <span>⏱️ {recipe.total_time} мин</span>
                        <span>👥 {recipe.servings} порций</span>
                        <span className={`difficulty ${recipe.difficulty}`}>
                          {recipe.difficulty === 'easy' && '🥄 Легко'}
                          {recipe.difficulty === 'medium' && '👨‍🍳 Средне'}
                          {recipe.difficulty === 'hard' && '🎯 Сложно'}
                        </span>
                      </div>
                      
                      <div className="recipe-categories">
                        {recipe.categories && (
                          <span className="category-tag">{recipe.categories.name}</span>
                        )}
                        {recipe.cuisine && (
                          <span className="cuisine-tag">
                            {recipe.cuisine.country_code} {recipe.cuisine.name}
                          </span>
                        )}
                      </div>
                      
                      {recipe.main_ingredients.length > 0 && (
                        <div className="recipe-ingredients">
                          <strong>Основные ингредиенты:</strong>
                          <div className="ingredients-preview">
                            {recipe.main_ingredients.map((ing, index) => (
                              <span key={index} className="ingredient">
                                {ing.ingredients?.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="recipe-footer">
                        <span className="author">Автор: @{recipe.profiles?.username}</span>
                        <div className="view-recipe-link">
                          Открыть рецепт →
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно с полной информацией о рецепте */}
      {selectedRecipe && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="recipe-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>
            
            {modalLoading ? (
              <div className="modal-loading">Загрузка рецепта...</div>
            ) : recipeDetails ? (
              <>
                {/* Заголовок и изображение */}
                <div className="recipe-modal-header">
                  {recipeDetails.image_url && (
                    <div className="recipe-modal-image">
                      <img src={recipeDetails.image_url} alt={recipeDetails.title} />
                    </div>
                  )}
                  
                  <div className="recipe-modal-title-section">
                    <h1>{recipeDetails.title}</h1>
                    <div className="recipe-modal-actions">
                      <button
                        className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                        onClick={toggleFavorite}
                        disabled={favoriteLoading}
                      >
                        {favoriteLoading ? '...' : (isFavorite ? '❤️ В избранном' : '🤍 Добавить в избранное')}
                        {currentProfile && ` (${currentProfile.username})`}
                      </button>
                    </div>
                  </div>

                  <div className="recipe-modal-meta">
                    <div className="meta-item">
                      <span>⏱️ Общее время:</span>
                      <strong>{formatTime(recipeDetails.preparation_time + (recipeDetails.cooking_time || 0))}</strong>
                    </div>
                    <div className="meta-item">
                      <span>👥 Порций:</span>
                      <strong>{recipeDetails.servings}</strong>
                    </div>
                    <div className="meta-item">
                      <span>Сложность:</span>
                      <strong className={`difficulty ${recipeDetails.difficulty}`}>
                        {recipeDetails.difficulty === 'easy' && '🥄 Легко'}
                        {recipeDetails.difficulty === 'medium' && '👨‍🍳 Средне'}
                        {recipeDetails.difficulty === 'hard' && '🎯 Сложно'}
                      </strong>
                    </div>
                    <div className="meta-item">
                      <span>⭐ Рейтинг:</span>
                      <strong>
                        {getAverageRating(recipeDetails.ratings).toFixed(1)} 
                        ({recipeDetails.ratings?.length || 0} оценок)
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="recipe-modal-body">
                  {/* Левая колонка - ингредиенты */}
                  <div className="modal-left-column">
                    <section className="modal-ingredients-section">
                      <h2>🛒 Ингредиенты</h2>
                      <div className="modal-ingredients-list">
                        {recipeDetails.recipe_ingredients?.map((item, index) => (
                          <div key={index} className="modal-ingredient-item">
                            <span className="ingredient-quantity">
                              {item.quantity} {item.unit}
                            </span>
                            <span className="ingredient-name">
                              {item.ingredients?.name}
                            </span>
                            {item.notes && (
                              <span className="ingredient-notes">({item.notes})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Правая колонка - описание и шаги */}
                  <div className="modal-right-column">
                    {recipeDetails.description && (
                      <section className="modal-description-section">
                        <h2>📝 Описание</h2>
                        <p>{recipeDetails.description}</p>
                      </section>
                    )}

                    <section className="modal-steps-section">
                      <h2>👨‍🍳 Процесс приготовления</h2>
                      <div className="modal-steps-list">
                        {recipeDetails.cooking_steps?.map((step, index) => (
                          <div key={index} className="modal-step-item">
                            <div className="step-header">
                              <span className="step-number">Шаг {step.step_number}</span>
                              {step.duration && (
                                <span className="step-duration">
                                  ⏱️ {formatTime(step.duration)}
                                </span>
                              )}
                            </div>
                            <p className="step-instruction">{step.instruction}</p>
                            {step.image_url && (
                              <img 
                                src={step.image_url} 
                                alt={`Шаг ${step.step_number}`}
                                className="step-image"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Информация о рецепте */}
                    <section className="modal-info-section">
                      <h2>📋 Информация о рецепте</h2>
                      <div className="modal-info-grid">
                        <div className="info-item">
                          <strong>Категория:</strong>
                          <span>{recipeDetails.categories?.name}</span>
                        </div>
                        {recipeDetails.recipe_cuisines?.[0] && (
                          <div className="info-item">
                            <strong>Кухня:</strong>
                            <span>
                              {recipeDetails.recipe_cuisines[0].cuisines.country_code} 
                              {recipeDetails.recipe_cuisines[0].cuisines.name}
                            </span>
                          </div>
                        )}
                        <div className="info-item">
                          <strong>Автор:</strong>
                          <span className="author-info">
                            {recipeDetails.profiles?.avatar_url && (
                              <img 
                                src={recipeDetails.profiles.avatar_url} 
                                alt={recipeDetails.profiles.username}
                                className="author-avatar"
                              />
                            )}
                            @{recipeDetails.profiles?.username}
                          </span>
                        </div>
                        {currentProfile && (
                          <div className="info-item">
                            <strong>Добавляет в избранное:</strong>
                            <span className="current-user-info">
                              {currentProfile.avatar_url && (
                                <img 
                                  src={currentProfile.avatar_url} 
                                  alt={currentProfile.username}
                                  className="current-user-avatar"
                                />
                              )}
                              @{currentProfile.username}
                            </span>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </>
            ) : (
              <div className="modal-error">Ошибка при загрузке рецепта</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;