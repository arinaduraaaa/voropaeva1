import React, { useState, useEffect } from 'react';
import { supabase } from '../../client/AuthClient';
import './ProfileModal.css';

const ProfileModal = ({ isOpen, onClose, onLogout, user, onProfileUpdate }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    full_name: '',
    bio: '',
    cooking_experience: 'beginner'
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  
  // Состояния для рецептов пользователя
  const [userRecipes, setUserRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('recipes'); // 'recipes', 'favorites', 'ratings'

  useEffect(() => {
    if (isOpen && user) {
      console.log('ProfileModal received user:', user);
      if (user.username && user.email) {
        setUserProfile(user);
        setEditForm({
          username: user.username || '',
          full_name: user.full_name || '',
          bio: user.bio || '',
          cooking_experience: user.cooking_experience || 'beginner'
        });
        setAvatarPreview(user.avatar_url || '');
        loadUserRecipes(user.id);
      } else {
        loadUserProfile();
      }
    }
  }, [isOpen, user]);

  const loadUserProfile = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    try {
      console.log('Loading profile for email:', user.email);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
      } else {
        console.log('Profile loaded:', profile);
        setUserProfile(profile);
        setEditForm({
          username: profile.username || '',
          full_name: profile.full_name || '',
          bio: profile.bio || '',
          cooking_experience: profile.cooking_experience || 'beginner'
        });
        setAvatarPreview(profile.avatar_url || '');
        loadUserRecipes(profile.id);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRecipes = async (userId) => {
    if (!userId) return;
    
    setRecipesLoading(true);
    try {
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select(`
          *,
          categories!category_id (name),
          recipe_cuisines (
            cuisines (name, country_code)
          ),
          ratings (rating),
          favorites (id)
        `)
        .eq('author_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading user recipes:', error);
      } else {
        console.log('User recipes loaded:', recipes);
        
        // Обрабатываем рецепты для отображения
        const processedRecipes = (recipes || []).map(recipe => {
          const avgRating = recipe.ratings && recipe.ratings.length > 0 
            ? recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length
            : null;

          const cuisine = recipe.recipe_cuisines?.[0]?.cuisines;
          const favoritesCount = recipe.favorites?.length || 0;

          return {
            ...recipe,
            average_rating: avgRating,
            cuisine: cuisine,
            favorites_count: favoritesCount,
            total_time: recipe.preparation_time + (recipe.cooking_time || 0)
          };
        });

        setUserRecipes(processedRecipes);
      }
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setRecipesLoading(false);
    }
  };

  const loadUserFavorites = async (userId) => {
    if (!userId) return;
    
    setRecipesLoading(true);
    try {
      const { data: favorites, error } = await supabase
        .from('favorites')
        .select(`
          recipes (
            *,
            categories!category_id (name),
            recipe_cuisines (cuisines (name, country_code)),
            ratings (rating),
            profiles!author_id (username)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading favorites:', error);
      } else {
        const favoriteRecipes = (favorites || [])
          .map(fav => fav.recipes)
          .filter(recipe => recipe) // Убираем null значения
          .map(recipe => {
            const avgRating = recipe.ratings && recipe.ratings.length > 0 
              ? recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length
              : null;

            const cuisine = recipe.recipe_cuisines?.[0]?.cuisines;

            return {
              ...recipe,
              average_rating: avgRating,
              cuisine: cuisine,
              total_time: recipe.preparation_time + (recipe.cooking_time || 0)
            };
          });

        setUserRecipes(favoriteRecipes);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setRecipesLoading(false);
    }
  };

  const loadUserRatings = async (userId) => {
    if (!userId) return;
    
    setRecipesLoading(true);
    try {
      const { data: ratings, error } = await supabase
        .from('ratings')
        .select(`
          rating,
          comment,
          created_at,
          recipes (
            *,
            categories!category_id (name),
            recipe_cuisines (cuisines (name, country_code)),
            profiles!author_id (username)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading ratings:', error);
      } else {
        const ratedRecipes = (ratings || []).map(ratingData => {
          const recipe = ratingData.recipes;
          const cuisine = recipe.recipe_cuisines?.[0]?.cuisines;

          return {
            ...recipe,
            user_rating: ratingData.rating,
            user_comment: ratingData.comment,
            rated_at: ratingData.created_at,
            cuisine: cuisine,
            total_time: recipe.preparation_time + (recipe.cooking_time || 0)
          };
        });

        setUserRecipes(ratedRecipes);
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
    } finally {
      setRecipesLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const userId = userProfile?.id || user?.id;
    
    if (!userId) return;

    switch (tab) {
      case 'recipes':
        loadUserRecipes(userId);
        break;
      case 'favorites':
        loadUserFavorites(userId);
        break;
      case 'ratings':
        loadUserRatings(userId);
        break;
      default:
        loadUserRecipes(userId);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setMessage('Пожалуйста, выберите изображение');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setMessage('Размер файла не должен превышать 2MB');
        return;
      }

      setAvatarFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setMessage('');
    setAvatarFile(null);
    if (!isEditing) {
      setAvatarPreview(userProfile?.avatar_url || '');
    }
  };

  const handleEditChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveProfile = async () => {
    if (!userProfile) return;
    
    setSaveLoading(true);
    setMessage('');

    try {
      let avatarUrl = userProfile.avatar_url;

      if (avatarFile) {
        const reader = new FileReader();
        avatarUrl = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(avatarFile);
        });
      }

      if (editForm.username !== userProfile.username) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', editForm.username)
          .neq('id', userProfile.id)
          .single();

        if (existingUser) {
          setMessage('Это имя пользователя уже занято');
          setSaveLoading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          username: editForm.username,
          full_name: editForm.full_name,
          bio: editForm.bio,
          cooking_experience: editForm.cooking_experience,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setUserProfile(data);
      setIsEditing(false);
      setMessage('Профиль успешно обновлен!');
      setAvatarFile(null);
      
      if (onProfileUpdate) {
        onProfileUpdate(data);
      }

      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Ошибка при обновлении профиля');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditForm({
      username: userProfile?.username || '',
      full_name: userProfile?.full_name || '',
      bio: userProfile?.bio || '',
      cooking_experience: userProfile?.cooking_experience || 'beginner'
    });
    setIsEditing(false);
    setMessage('');
    setAvatarFile(null);
    setAvatarPreview(userProfile?.avatar_url || '');
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview('');
    setAvatarFile(null);
  };

  const getExperienceLabel = (experience) => {
    switch (experience) {
      case 'beginner': return '🥄 Начинающий';
      case 'intermediate': return '👨‍🍳 Опытный';
      case 'expert': return '🎯 Шеф-повар';
      default: return '🥄 Начинающий';
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch {
      return new Date().toLocaleDateString('ru-RU');
    }
  };

  const getFavoritesCount = () => {
    // Здесь можно добавить загрузку реального количества избранных рецептов
    return userRecipes.filter(recipe => activeTab === 'favorites').length;
  };

  const getRatingsCount = () => {
    // Здесь можно добавить загрузку реального количества оценок
    return userRecipes.filter(recipe => activeTab === 'ratings').length;
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="profile-modal-overlay">
        <div className="profile-modal">
          <button className="close-btn" onClick={onClose}>×</button>
          <div className="loading">Загрузка...</div>
        </div>
      </div>
    );
  }

  const displayProfile = userProfile || user || {
    username: 'user',
    full_name: 'Пользователь',
    email: 'unknown@email.com',
    cooking_experience: 'beginner',
    created_at: new Date().toISOString(),
    bio: '',
    avatar_url: ''
  };

  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal">
        <button className="close-btn" onClick={onClose}>×</button>
        
        {message && (
          <div className={`message ${message.includes('успешно') ? 'success-message' : 'error-message'}`}>
            {message}
          </div>
        )}

        <div className="profile-header">
          <div className="profile-avatar">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="avatar-image" />
            ) : (
              <div className="avatar-placeholder">👨‍🍳</div>
            )}
            {isEditing && (
              <div className="avatar-controls">
                <input
                  type="file"
                  id="avatar-input"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="avatar-input"
                />
                <label htmlFor="avatar-input" className="avatar-edit-btn">
                  📷
                </label>
                {avatarPreview && (
                  <button 
                    className="avatar-remove-btn"
                    onClick={handleRemoveAvatar}
                    title="Удалить аватар"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="profile-info">
            {isEditing ? (
              <div className="edit-form">
                <input
                  type="text"
                  name="full_name"
                  placeholder="Полное имя"
                  value={editForm.full_name}
                  onChange={handleEditChange}
                  className="edit-input"
                />
                <input
                  type="text"
                  name="username"
                  placeholder="Имя пользователя"
                  value={editForm.username}
                  onChange={handleEditChange}
                  className="edit-input"
                />
                <textarea
                  name="bio"
                  placeholder="О себе..."
                  value={editForm.bio}
                  onChange={handleEditChange}
                  className="edit-textarea"
                  rows="3"
                />
                <select
                  name="cooking_experience"
                  value={editForm.cooking_experience}
                  onChange={handleEditChange}
                  className="edit-select"
                >
                  <option value="beginner">Начинающий</option>
                  <option value="intermediate">Опытный</option>
                  <option value="expert">Шеф-повар</option>
                </select>
              </div>
            ) : (
              <>
                <h2>{displayProfile.full_name}</h2>
                <p>@{displayProfile.username}</p>
                <span className={`experience-badge ${displayProfile.cooking_experience}`}>
                  {getExperienceLabel(displayProfile.cooking_experience)}
                </span>
                {displayProfile.bio && (
                  <p className="profile-bio">{displayProfile.bio}</p>
                )}
                <p className="join-date">
                  Участник с {formatDate(displayProfile.created_at)}
                </p>
                <p className="profile-email">{displayProfile.email}</p>
              </>
            )}
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat">
            <span className="stat-number">{userRecipes.length}</span>
            <span className="stat-label">Рецепты</span>
          </div>
        </div>

        {/* Табы с рецептами */}
        <div className="profile-content">
          <div className="profile-tabs">
            <button 
              className={`tab-btn ${activeTab === 'recipes' ? 'active' : ''}`}
              onClick={() => handleTabChange('recipes')}
            >
              Мои рецепты
            </button>
           
           
          </div>

          <div className="recipes-section">
            {recipesLoading ? (
              <div className="loading-recipes">Загрузка...</div>
            ) : userRecipes.length > 0 ? (
              <div className="user-recipes-grid">
                {userRecipes.map(recipe => (
                  <div key={recipe.id} className="user-recipe-card">
                    <div className="recipe-image">
                      {recipe.image_url ? (
                        <img src={recipe.image_url} alt={recipe.title} />
                      ) : (
                        <div className="recipe-image-placeholder">🍳</div>
                      )}
                    </div>
                    
                    <div className="recipe-content">
                      <h4>{recipe.title}</h4>
                      
                      <div className="recipe-meta-small">
                        <span>⏱️ {recipe.total_time} мин</span>
                        <span>👥 {recipe.servings} порций</span>
                        <span className={`difficulty ${recipe.difficulty}`}>
                          {recipe.difficulty === 'easy' && '🥄'}
                          {recipe.difficulty === 'medium' && '👨‍🍳'}
                          {recipe.difficulty === 'hard' && '🎯'}
                        </span>
                      </div>

                      {recipe.categories && (
                        <span className="category-badge">{recipe.categories.name}</span>
                      )}

                      {activeTab === 'ratings' && recipe.user_rating && (
                        <div className="user-rating">
                          <span>Ваша оценка: </span>
                          <span className="rating-stars">
                            {'⭐'.repeat(recipe.user_rating)}
                          </span>
                          <span>({recipe.user_rating}/5)</span>
                        </div>
                      )}

                      {activeTab === 'favorites' && recipe.profiles && (
                        <div className="recipe-author">
                          Автор: @{recipe.profiles.username}
                        </div>
                      )}

                      <div className="recipe-status">
                        {recipe.is_published ? (
                          <span className="published">✅ Опубликован</span>
                        ) : (
                          <span className="draft">📝 Черновик</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-recipes">
                <p>
                  {activeTab === 'recipes' && 'У вас пока нет рецептов'}
                  {activeTab === 'favorites' && 'У вас пока нет избранных рецептов'}
                  {activeTab === 'ratings' && 'Вы пока не оценили ни одного рецепта'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="profile-actions">
          {isEditing ? (
            <div className="edit-actions">
              <button 
                className="save-btn" 
                onClick={handleSaveProfile}
                disabled={saveLoading}
              >
                {saveLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button 
                className="cancel-btn" 
                onClick={handleCancelEdit}
                disabled={saveLoading}
              >
                Отмена
              </button>
            </div>
          ) : (
            <button className="edit-profile-btn" onClick={handleEditToggle}>
              Редактировать профиль
            </button>
          )}
          <button className="logout-btn" onClick={onLogout}>Выйти</button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;