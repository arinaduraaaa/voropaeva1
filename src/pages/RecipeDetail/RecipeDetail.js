import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../client/AuthClient';
import './RecipeDetail.css';

const MyRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      loadUserRecipes(user.id);
    } else {
      setLoading(false);
    }
  };

  const loadUserRecipes = async (userId) => {
    try {
      setLoading(true);
      console.log('Loading recipes for user:', userId);
      
      const { data: recipesData, error } = await supabase
        .from('recipes')
        .select(`
          *,
          categories (name),
          cuisines (name)
        `)
        .eq('author_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading recipes:', error);
        return;
      }

      console.log('Recipes loaded:', recipesData);
      setRecipes(recipesData || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecipe = async (recipeId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот рецепт?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId);

      if (error) throw error;

      setRecipes(recipes.filter(recipe => recipe.id !== recipeId));
      alert('Рецепт успешно удален!');
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Ошибка при удалении рецепта');
    }
  };

  const togglePublishStatus = async (recipe) => {
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ 
          is_published: !recipe.is_published,
          updated_at: new Date().toISOString()
        })
        .eq('id', recipe.id);

      if (error) throw error;

      // Обновляем локальное состояние
      setRecipes(recipes.map(r => 
        r.id === recipe.id 
          ? { ...r, is_published: !r.is_published }
          : r
      ));
    } catch (error) {
      console.error('Error updating recipe:', error);
      alert('Ошибка при обновлении рецепта');
    }
  };

  if (!currentUser) {
    return (
      <div className="my-recipes">
        <div className="container">
          <div className="auth-required">
            <h2>Требуется авторизация</h2>
            <p>Пожалуйста, войдите в систему чтобы просмотреть свои рецепты</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="my-recipes">
        <div className="container">
          <div className="loading">Загрузка ваших рецептов...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-recipes">
      <div className="container">
        <div className="page-header">
          <h1>Мои рецепты</h1>
          <Link to="/add-recipe" className="add-recipe-btn">
            + Добавить новый рецепт
          </Link>
        </div>

        {recipes.length === 0 ? (
          <div className="no-recipes">
            <div className="no-recipes-content">
              <h2>У вас пока нет рецептов</h2>
              <p>Создайте свой первый рецепт и поделитесь им с сообществом!</p>
              <Link to="/add-recipe" className="cta-button">
                Создать первый рецепт
              </Link>
            </div>
          </div>
        ) : (
          <div className="recipes-grid">
            {recipes.map(recipe => (
              <div key={recipe.id} className="recipe-card">
                <div className="recipe-image">
                  <img 
                    src={recipe.image_url || '/images/default-recipe.jpg'} 
                    alt={recipe.title}
                    onError={(e) => {
                      e.target.src = '/images/default-recipe.jpg';
                    }}
                  />
                  <div className="recipe-actions">
                    <button
                      className={`publish-btn ${recipe.is_published ? 'published' : 'draft'}`}
                      onClick={() => togglePublishStatus(recipe)}
                    >
                      {recipe.is_published ? '📢 Опубликован' : '📝 Черновик'}
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => deleteRecipe(recipe.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="recipe-info">
                  <h3 className="recipe-title">{recipe.title}</h3>
                  <p className="recipe-description">
                    {recipe.description?.substring(0, 100)}
                    {recipe.description?.length > 100 && '...'}
                  </p>
                  
                  <div className="recipe-meta">
                    <span className="meta-item">⏱️ {recipe.preparation_time + recipe.cooking_time} мин</span>
                    <span className="meta-item">👥 {recipe.servings} порций</span>
                    <span className="meta-item difficulty">
                      {recipe.difficulty === 'easy' && '🥄 Легко'}
                      {recipe.difficulty === 'medium' && '👨‍🍳 Средне'}
                      {recipe.difficulty === 'hard' && '🎯 Сложно'}
                    </span>
                  </div>
                  
                  <div className="recipe-categories">
                    {recipe.categories && (
                      <span className="category-tag">{recipe.categories.name}</span>
                    )}
                    {recipe.cuisines && (
                      <span className="cuisine-tag">{recipe.cuisines.name}</span>
                    )}
                  </div>
                  
                  <div className="recipe-footer">
                    <span className="created-date">
                      Создан: {new Date(recipe.created_at).toLocaleDateString('ru-RU')}
                    </span>
                    <Link to={`/recipe/${recipe.id}`} className="view-recipe-btn">
                      Посмотреть рецепт →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="recipes-stats">
          <div className="stat-card">
            <span className="stat-number">{recipes.length}</span>
            <span className="stat-label">Всего рецептов</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {recipes.filter(r => r.is_published).length}
            </span>
            <span className="stat-label">Опубликовано</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {recipes.filter(r => !r.is_published).length}
            </span>
            <span className="stat-label">Черновики</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyRecipes;