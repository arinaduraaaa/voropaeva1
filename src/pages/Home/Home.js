import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../client/AuthClient';
import './Home.css';

const Home = () => {
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [worldCuisines, setWorldCuisines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [recipeDetails, setRecipeDetails] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      
      // Загрузка популярных рецептов с информацией об авторе и категории
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select(`
          *,
          profiles!author_id (username),
          categories!category_id (name)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (recipesError) throw recipesError;

      setFeaturedRecipes(recipesData || []);

      // Загрузка категорий с подсчетом рецептов
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select(`
          *,
          recipes!category_id (id)
        `)
        .limit(3);

      if (categoriesError) throw categoriesError;

      const categoriesWithCount = (categoriesData || []).map(category => ({
        id: category.id,
        name: category.name,
        recipe_count: category.recipes ? category.recipes.length : 0
      }))
      .sort((a, b) => b.recipe_count - a.recipe_count);

      setPopularCategories(categoriesWithCount);

      // Загрузка кухонь через recipe_cuisines
      const { data: cuisinesData, error: cuisinesError } = await supabase
        .from('cuisines')
        .select(`
          *,
          recipe_cuisines (recipe_id)
        `)
        .limit(3);

      if (cuisinesError) throw cuisinesError;

      const cuisinesWithCount = (cuisinesData || []).map(cuisine => ({
        id: cuisine.id,
        name: cuisine.name,
        country_code: cuisine.country_code || '🌍',
        recipe_count: cuisine.recipe_cuisines ? cuisine.recipe_cuisines.length : 0
      }))
      .sort((a, b) => b.recipe_count - a.recipe_count);

      setWorldCuisines(cuisinesWithCount);

    } catch (error) {
      console.error('Error loading home data:', error);
      
      // Fallback на случай ошибки
      await loadFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackData = async () => {
    try {
      // Простая загрузка без сложных связей
      const { data: recipesData } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_published', true)
        .limit(6)
        .order('created_at', { ascending: false });

      setFeaturedRecipes(recipesData || []);

      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .limit(3);

      const categoriesWithFallback = (categoriesData || []).map(category => ({
        ...category,
        recipe_count: 0
      }));
      setPopularCategories(categoriesWithFallback);

      const { data: cuisinesData } = await supabase
        .from('cuisines')
        .select('*')
        .limit(3);

      const cuisinesWithFallback = (cuisinesData || []).map(cuisine => ({
        ...cuisine,
        recipe_count: 0
      }));
      setWorldCuisines(cuisinesWithFallback);

    } catch (fallbackError) {
      console.error('Error loading fallback data:', fallbackError);
    }
  };

  const loadRecipeDetails = async (recipeId) => {
    try {
      setModalLoading(true);

      // Загрузка полной информации о рецепте
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select(`
          *,
          profiles!author_id (username, full_name),
          categories!category_id (name, description),
          recipe_cuisines (
            cuisines (name, country_code)
          )
        `)
        .eq('id', recipeId)
        .single();

      if (recipeError) throw recipeError;

      // Загрузка ингредиентов
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select(`
          *,
          ingredients (name, description)
        `)
        .eq('recipe_id', recipeId)
        .order('id', { ascending: true });

      if (ingredientsError) throw ingredientsError;

      // Загрузка шагов приготовления
      const { data: stepsData, error: stepsError } = await supabase
        .from('cooking_steps')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('step_number', { ascending: true });

      if (stepsError) throw stepsError;

      // Загрузка рейтингов
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('ratings')
        .select('*')
        .eq('recipe_id', recipeId);

      if (ratingsError) throw ratingsError;

      // Расчет среднего рейтинга
      const averageRating = ratingsData && ratingsData.length > 0 
        ? ratingsData.reduce((sum, rating) => sum + rating.rating, 0) / ratingsData.length
        : null;

      setRecipeDetails({
        ...recipeData,
        ingredients: ingredientsData || [],
        cooking_steps: stepsData || [],
        ratings: ratingsData || [],
        average_rating: averageRating
      });

    } catch (error) {
      console.error('Error loading recipe details:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleRecipeClick = async (recipe) => {
    setSelectedRecipe(recipe);
    setShowModal(true);
    await loadRecipeDetails(recipe.id);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRecipe(null);
    setRecipeDetails(null);
  };

  if (loading) {
    return (
      <div className="home">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Добро пожаловать в мир вкусных рецептов</h1>
          <p>Откройте для себя тысячи рецептов от шеф-поваров со всего мира</p>
          <div className="hero-actions">
            <Link to="/recipes" className="cta-button primary">
              Найти рецепты
            </Link>
            <Link to="/add-recipe" className="cta-button secondary">
              Добавить рецепт
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Recipes */}
      <section className="featured-section">
        <h2>Популярные рецепты</h2>
        {featuredRecipes.length === 0 ? (
          <div className="no-data">
            <p>Пока нет опубликованных рецептов</p>
            <Link to="/add-recipe" className="cta-button">
              Создать первый рецепт
            </Link>
          </div>
        ) : (
          <div className="recipes-grid">
            {featuredRecipes.map(recipe => (
              <div 
                key={recipe.id} 
                className="recipe-card"
                onClick={() => handleRecipeClick(recipe)}
              >
                <div className="recipe-info">
                  <h3>{recipe.title}</h3>
                  <div className="recipe-meta">
                    <span>⏱️ {recipe.preparation_time + (recipe.cooking_time || 0)} мин</span>
                    <span>👥 {recipe.servings} порций</span>
                    <span className={`difficulty ${recipe.difficulty}`}>
                      {recipe.difficulty === 'easy' && '🥄 Легко'}
                      {recipe.difficulty === 'medium' && '👨‍🍳 Средне'}
                      {recipe.difficulty === 'hard' && '🎯 Сложно'}
                    </span>
                  </div>
                  <p className="author">Автор: @{recipe.profiles?.username || 'Неизвестный'}</p>
                  {recipe.categories && (
                    <p className="category">Категория: {recipe.categories.name}</p>
                  )}
                  <div className="view-recipe-link">
                    Посмотреть рецепт
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="categories-section">
        <h2>Популярные категории</h2>
        {popularCategories.length === 0 ? (
          <div className="no-data">
            <p>Категории пока не добавлены</p>
          </div>
        ) : (
          <div className="categories-grid">
            {popularCategories.map(category => (
              <div key={category.id} className="category-card">
                <div className="category-info">
                  <h3>{category.name}</h3>
                  <p>{category.recipe_count} рецептов</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* World Cuisines */}
      <section className="cuisines-section">
        <h2>Кухни мира</h2>
        {worldCuisines.length === 0 ? (
          <div className="no-data">
            <p>Кухни мира пока не добавлены</p>
          </div>
        ) : (
          <div className="cuisines-list">
            {worldCuisines.map(cuisine => (
              <div key={cuisine.id} className="cuisine-item">
                <span className="flag">{cuisine.country_code}</span>
                <span className="cuisine-name">{cuisine.name}</span>
                <span className="recipe-count">{cuisine.recipe_count} рецептов</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal Window */}
      {showModal && selectedRecipe && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>
            
            {modalLoading ? (
              <div className="modal-loading">Загрузка рецепта...</div>
            ) : (
              <>
                {recipeDetails?.image_url && (
                  <img 
                    src={recipeDetails.image_url} 
                    alt={recipeDetails.title}
                    className="modal-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                
                <div className="modal-header">
                  <h2>{recipeDetails?.title || selectedRecipe.title}</h2>
                  <div className="modal-categories">
                    {recipeDetails?.categories && (
                      <span className="modal-category">{recipeDetails.categories.name}</span>
                    )}
                    {recipeDetails?.recipe_cuisines?.[0] && (
                      <span className="modal-cuisine">
                        {recipeDetails.recipe_cuisines[0].cuisines.country_code} 
                        {recipeDetails.recipe_cuisines[0].cuisines.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="modal-meta">
                  <div className="meta-item">
                    <span>⏱️ Подготовка:</span>
                    <strong>{recipeDetails?.preparation_time || selectedRecipe.preparation_time} мин</strong>
                  </div>
                  <div className="meta-item">
                    <span>🍳 Приготовление:</span>
                    <strong>{recipeDetails?.cooking_time || selectedRecipe.cooking_time || 0} мин</strong>
                  </div>
                  <div className="meta-item">
                    <span>👥 Порций:</span>
                    <strong>{recipeDetails?.servings || selectedRecipe.servings}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Сложность:</span>
                    <strong className={`difficulty ${recipeDetails?.difficulty || selectedRecipe.difficulty}`}>
                      {recipeDetails?.difficulty === 'easy' && '🥄 Легко'}
                      {recipeDetails?.difficulty === 'medium' && '👨‍🍳 Средне'}
                      {recipeDetails?.difficulty === 'hard' && '🎯 Сложно'}
                    </strong>
                  </div>
                  <div className="meta-item">
                    <span>👤 Автор:</span>
                    <strong>@{recipeDetails?.profiles?.username || selectedRecipe.profiles?.username || 'Неизвестный'}</strong>
                  </div>
                  {recipeDetails?.average_rating && (
                    <div className="meta-item">
                      <span>⭐ Рейтинг:</span>
                      <strong>{recipeDetails.average_rating.toFixed(1)}/5</strong>
                    </div>
                  )}
                </div>

                {recipeDetails?.description && (
                  <div className="modal-description">
                    <h3>Описание</h3>
                    <p>{recipeDetails.description}</p>
                  </div>
                )}

                {/* Ингредиенты */}
                {recipeDetails?.ingredients && recipeDetails.ingredients.length > 0 && (
                  <div className="modal-ingredients">
                    <h3>Ингредиенты</h3>
                    <div className="ingredients-list">
                      {recipeDetails.ingredients.map((item, index) => (
                        <div key={index} className="ingredient-item">
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
                  </div>
                )}

                {/* Шаги приготовления */}
                {recipeDetails?.cooking_steps && recipeDetails.cooking_steps.length > 0 && (
                  <div className="modal-steps">
                    <h3>Процесс приготовления</h3>
                    <div className="steps-list">
                      {recipeDetails.cooking_steps.map((step, index) => (
                        <div key={step.id} className="step-item">
                          <div className="step-header">
                            <span className="step-number">Шаг {step.step_number}</span>
                            {step.duration && (
                              <span className="step-duration">⏱️ {step.duration} мин</span>
                            )}
                          </div>
                          <p className="step-instruction">{step.instruction}</p>
                          {step.image_url && (
                            <img 
                              src={step.image_url} 
                              alt={`Шаг ${step.step_number}`}
                              className="step-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="modal-actions">
                  <button className="cta-button secondary" onClick={closeModal}>
                    Закрыть
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;