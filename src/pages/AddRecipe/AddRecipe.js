import React, { useState, useEffect } from 'react';
import { supabase } from '../../client/AuthClient';
import { useNavigate } from 'react-router-dom';
import './AddRecipe.css';

const AddRecipe = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchResults, setSearchResults] = useState({});
  const navigate = useNavigate();

  const [recipeData, setRecipeData] = useState({
    title: '',
    description: '',
    category_id: '',
    cuisine_id: '',
    preparation_time: '',
    cooking_time: '',
    servings: '',
    difficulty: 'medium',
    image_url: '',
    ingredients: [{ ingredient_id: '', name: '', quantity: '', unit: '', notes: '' }],
    instructions: [{ step_number: 1, instruction: '', duration: '' }],
    tags: [],
    cooking_equipment: []
  });

  useEffect(() => {
    loadInitialData();
    checkCurrentUser();
  }, []);

  const checkCurrentUser = () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  };

  const loadInitialData = async () => {
    try {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      const { data: cuisinesData } = await supabase
        .from('cuisines')
        .select('*')
        .order('name');

      const { data: ingredientsData } = await supabase
        .from('ingredients')
        .select('*')
        .order('name');

      setCategories(categoriesData || []);
      setCuisines(cuisinesData || []);
      setIngredients(ingredientsData || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const isFormComplete = () => {
    return recipeData.title.trim() && 
           recipeData.description.trim() && 
           recipeData.category_id && 
           recipeData.preparation_time && 
           recipeData.cooking_time && 
           recipeData.servings &&
           recipeData.ingredients.every(ing => ing.name.trim() && ing.quantity.trim()) &&
           recipeData.instructions.every(inst => inst.instruction.trim());
  };

  const handleImageUpload = async (file) => {
    if (!file || !currentUser) return null;
    
    setUploadingImage(true);
    try {
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return null;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5MB');
        return null;
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target.result);
        };
        reader.onerror = (error) => {
          reject(error);
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Ошибка при загрузке изображения');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleMainImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = await handleImageUpload(file);
      if (imageUrl) {
        handleInputChange('image_url', imageUrl);
      }
    }
  };

  const handleInputChange = (field, value) => {
    setRecipeData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayChange = (arrayName, index, field, value) => {
    setRecipeData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addArrayItem = (arrayName, template) => {
    setRecipeData(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], { ...template }]
    }));
  };

  const removeArrayItem = (arrayName, index) => {
    setRecipeData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index)
    }));
  };

  const searchIngredients = async (searchTerm, index) => {
    if (!searchTerm.trim()) {
      setSearchResults(prev => ({ ...prev, [index]: { results: [], showAdd: false } }));
      return;
    }

    const { data: ingredientsData } = await supabase
      .from('ingredients')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .order('name')
      .limit(5);

    const exactMatch = ingredientsData?.find(ing => 
      ing.name.toLowerCase() === searchTerm.toLowerCase()
    );

    setSearchResults(prev => ({ 
      ...prev, 
      [index]: { 
        results: ingredientsData || [], 
        showAdd: !exactMatch && searchTerm.trim().length > 0
      } 
    }));
  };

  const addNewIngredient = async (ingredientName) => {
    try {
      const { data: newIngredient, error } = await supabase
        .from('ingredients')
        .insert([
          {
            name: ingredientName,
            description: '',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setIngredients(prev => [...prev, newIngredient]);
      return newIngredient;
    } catch (error) {
      console.error('Error adding new ingredient:', error);
      throw error;
    }
  };

  const handleIngredientSelect = (index, ingredient) => {
    handleArrayChange('ingredients', index, 'ingredient_id', ingredient.id);
    handleArrayChange('ingredients', index, 'name', ingredient.name);
    setSearchResults(prev => ({ ...prev, [index]: { results: [], showAdd: false } }));
  };

  const handleAddNewIngredient = async (index, ingredientName) => {
    try {
      const newIngredient = await addNewIngredient(ingredientName);
      handleIngredientSelect(index, newIngredient);
    } catch (error) {
      alert('Ошибка при создании ингредиента');
    }
  };

  const handleIngredientInput = async (index, value) => {
    handleArrayChange('ingredients', index, 'name', value);
    
    if (value.length > 1) {
      await searchIngredients(value, index);
    } else {
      setSearchResults(prev => ({ ...prev, [index]: { results: [], showAdd: false } }));
    }
  };

  const handleIngredientBlur = (index) => {
    setTimeout(() => {
      setSearchResults(prev => ({ ...prev, [index]: { results: [], showAdd: false } }));
    }, 200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('Пожалуйста, войдите в систему чтобы добавить рецепт');
      return;
    }

    if (!recipeData.title.trim()) {
      alert('Пожалуйста, введите название рецепта');
      setActiveStep(1);
      return;
    }

    if (!recipeData.description.trim()) {
      alert('Пожалуйста, введите описание рецепта');
      setActiveStep(1);
      return;
    }

    if (!recipeData.category_id) {
      alert('Пожалуйста, выберите категорию');
      setActiveStep(1);
      return;
    }

    if (!recipeData.preparation_time || !recipeData.cooking_time || !recipeData.servings) {
      alert('Пожалуйста, заполните все временные параметры и количество порций');
      setActiveStep(1);
      return;
    }

    if (recipeData.ingredients.some(ing => !ing.name.trim() || !ing.quantity.trim())) {
      alert('Пожалуйста, заполните все обязательные поля ингредиентов');
      setActiveStep(2);
      return;
    }

    if (recipeData.instructions.some(inst => !inst.instruction.trim())) {
      alert('Пожалуйста, заполните все шаги приготовления');
      setActiveStep(3);
      return;
    }

    setLoading(true);

    try {
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert([
          {
            title: recipeData.title,
            description: recipeData.description,
            preparation_time: parseInt(recipeData.preparation_time),
            cooking_time: parseInt(recipeData.cooking_time),
            servings: parseInt(recipeData.servings),
            difficulty: recipeData.difficulty,
            category_id: parseInt(recipeData.category_id),
            author_id: currentUser.id,
            image_url: recipeData.image_url,
            is_published: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (recipeError) throw recipeError;

      const recipeId = recipe.id;

      if (recipeData.cuisine_id) {
        await supabase
          .from('recipe_cuisines')
          .insert([
            {
              recipe_id: recipeId,
              cuisine_id: parseInt(recipeData.cuisine_id),
              created_at: new Date().toISOString()
            }
          ]);
      }

      const ingredientsToInsert = recipeData.ingredients
        .filter(ing => ing.name && ing.quantity && ing.ingredient_id)
        .map(ing => ({
          recipe_id: recipeId,
          ingredient_id: parseInt(ing.ingredient_id),
          quantity: ing.quantity,
          unit: ing.unit || '',
          notes: ing.notes || '',
          created_at: new Date().toISOString()
        }));

      if (ingredientsToInsert.length > 0) {
        await supabase
          .from('recipe_ingredients')
          .insert(ingredientsToInsert);
      }

      const instructionsToInsert = recipeData.instructions
        .filter(inst => inst.instruction.trim())
        .map((inst, index) => ({
          recipe_id: recipeId,
          step_number: index + 1,
          instruction: inst.instruction,
          duration: parseInt(inst.duration) || 0,
          created_at: new Date().toISOString()
        }));

      if (instructionsToInsert.length > 0) {
        await supabase
          .from('cooking_steps')
          .insert(instructionsToInsert);
      }

      if (recipeData.tags && recipeData.tags.length > 0) {
        const tagPromises = recipeData.tags.map(async (tagName) => {
          const { data: existingTag } = await supabase
            .from('tags')
            .select('id')
            .eq('name', tagName)
            .single();

          if (existingTag) {
            return existingTag.id;
          } else {
            const { data: newTag } = await supabase
              .from('tags')
              .insert([{ name: tagName, created_at: new Date().toISOString() }])
              .select()
              .single();
            return newTag.id;
          }
        });

        const tagIds = await Promise.all(tagPromises);

        const recipeTags = tagIds.map(tagId => ({
          recipe_id: recipeId,
          tag_id: tagId,
          created_at: new Date().toISOString()
        }));

        await supabase
          .from('recipe_tags')
          .insert(recipeTags);
      }

      alert('Рецепт успешно добавлен!');
      
      const goToRecipes = window.confirm('Рецепт сохранен! Хотите перейти к списку рецептов?');
      if (goToRecipes) {
        navigate('/my-recipes');
      } else {
        setRecipeData({
          title: '',
          description: '',
          category_id: '',
          cuisine_id: '',
          preparation_time: '',
          cooking_time: '',
          servings: '',
          difficulty: 'medium',
          image_url: '',
          ingredients: [{ ingredient_id: '', name: '', quantity: '', unit: '', notes: '' }],
          instructions: [{ step_number: 1, instruction: '', duration: '' }],
          tags: [],
          cooking_equipment: []
        });
        setActiveStep(1);
      }

    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('Ошибка при сохранении рецепта: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (activeStep === 1) {
      if (!recipeData.title.trim() || !recipeData.description.trim() || !recipeData.category_id) {
        alert('Пожалуйста, заполните все обязательные поля');
        return;
      }
    } else if (activeStep === 2) {
      if (recipeData.ingredients.some(ing => !ing.name.trim() || !ing.quantity.trim())) {
        alert('Пожалуйста, заполните все обязательные поля ингредиентов');
        return;
      }
    } else if (activeStep === 3) {
      if (recipeData.instructions.some(inst => !inst.instruction.trim())) {
        alert('Пожалуйста, заполните все шаги приготовления');
        return;
      }
    }
    setActiveStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => setActiveStep(prev => Math.max(prev - 1, 1));

  if (!currentUser) {
    return (
      <div className="add-recipe">
        <div className="add-recipe-container">
          <div className="auth-required">
            <h2>Требуется авторизация</h2>
            <p>Пожалуйста, войдите в систему чтобы добавить рецепт</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="add-recipe">
      <div className="add-recipe-container">
        <h1>Добавить новый рецепт</h1>
        
        <div className="progress-bar">
          <div className="progress-steps">
            <div className={`step ${activeStep >= 1 ? 'active' : ''}`}>
              <span className="step-number">1</span>
              <span className="step-label">Основное</span>
            </div>
            <div className={`step ${activeStep >= 2 ? 'active' : ''}`}>
              <span className="step-number">2</span>
              <span className="step-label">Ингредиенты</span>
            </div>
            <div className={`step ${activeStep >= 3 ? 'active' : ''}`}>
              <span className="step-number">3</span>
              <span className="step-label">Приготовление</span>
            </div>
            <div className={`step ${activeStep >= 4 ? 'active' : ''}`}>
              <span className="step-number">4</span>
              <span className="step-label">Дополнительно</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="recipe-form">
          {activeStep === 1 && (
            <div className="form-step">
              <h2>Основная информация</h2>
              
              <div className="form-group">
                <label>Название рецепта *</label>
                <input
                  type="text"
                  value={recipeData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Введите название рецепта"
                  required
                />
              </div>

              <div className="form-group">
                <label>Описание *</label>
                <textarea
                  value={recipeData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Опишите ваш рецепт..."
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label>Изображение рецепта</label>
                <div className="image-upload-container">
                  <input
                    type="file"
                    id="main-image"
                    accept="image/*"
                    onChange={handleMainImageChange}
                    className="image-input"
                  />
                  <label htmlFor="main-image" className="image-upload-btn">
                    {uploadingImage ? '📤 Загрузка...' : '📷 Выбрать изображение'}
                  </label>
                  {recipeData.image_url && (
                    <div className="image-preview">
                      <img src={recipeData.image_url} alt="Preview" />
                      <span>Изображение загружено ✓</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Категория *</label>
                  <select
                    value={recipeData.category_id}
                    onChange={(e) => handleInputChange('category_id', e.target.value)}
                    required
                  >
                    <option value="">Выберите категорию</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Кухня</label>
                  <select
                    value={recipeData.cuisine_id}
                    onChange={(e) => handleInputChange('cuisine_id', e.target.value)}
                  >
                    <option value="">Выберите кухню</option>
                    {cuisines.map(cuisine => (
                      <option key={cuisine.id} value={cuisine.id}>{cuisine.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Время подготовки (мин) *</label>
                  <input
                    type="number"
                    value={recipeData.preparation_time}
                    onChange={(e) => handleInputChange('preparation_time', e.target.value)}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Время приготовления (мин) *</label>
                  <input
                    type="number"
                    value={recipeData.cooking_time}
                    onChange={(e) => handleInputChange('cooking_time', e.target.value)}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Количество порций *</label>
                  <input
                    type="number"
                    value={recipeData.servings}
                    onChange={(e) => handleInputChange('servings', e.target.value)}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Сложность *</label>
                <div className="difficulty-options">
                  {[
                    { value: 'easy', label: '🥄 Легкая', description: 'Для начинающих' },
                    { value: 'medium', label: '👨‍🍳 Средняя', description: 'Требует некоторого опыта' },
                    { value: 'hard', label: '🎯 Сложная', description: 'Для опытных поваров' }
                  ].map(option => (
                    <label key={option.value} className="difficulty-option">
                      <input
                        type="radio"
                        name="difficulty"
                        value={option.value}
                        checked={recipeData.difficulty === option.value}
                        onChange={(e) => handleInputChange('difficulty', e.target.value)}
                      />
                      <div className="option-content">
                        <span className="option-label">{option.label}</span>
                        <span className="option-description">{option.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="form-step">
              <h2>Ингредиенты</h2>
              
              <div className="ingredients-list">
                {recipeData.ingredients.map((ingredient, index) => (
                  <div key={index} className="ingredient-row">
                    <div className="ingredient-inputs">
                      <div className="ingredient-search">
                        <input
                          type="text"
                          placeholder="Начните вводить название ингредиента *"
                          value={ingredient.name}
                          onChange={(e) => handleIngredientInput(index, e.target.value)}
                          onBlur={() => handleIngredientBlur(index)}
                          required
                        />
                        {(searchResults[index]?.results.length > 0 || searchResults[index]?.showAdd) && (
                          <div className="search-results">
                            {searchResults[index]?.results.map((ing) => (
                              <div
                                key={ing.id}
                                className="search-result-item"
                                onClick={() => handleIngredientSelect(index, ing)}
                              >
                                {ing.name}
                              </div>
                            ))}
                            {searchResults[index]?.showAdd && (
                              <button
                                type="button"
                                className="add-new-ingredient-btn"
                                onClick={() => handleAddNewIngredient(index, ingredient.name)}
                              >
                                + Добавить "{ingredient.name}"
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Количество *"
                        value={ingredient.quantity}
                        onChange={(e) => handleArrayChange('ingredients', index, 'quantity', e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Единица измерения"
                        value={ingredient.unit}
                        onChange={(e) => handleArrayChange('ingredients', index, 'unit', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Примечания"
                        value={ingredient.notes}
                        onChange={(e) => handleArrayChange('ingredients', index, 'notes', e.target.value)}
                      />
                    </div>
                    {recipeData.ingredients.length > 1 && (
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeArrayItem('ingredients', index)}
                      >
                        ❌
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="add-more-btn"
                onClick={() => addArrayItem('ingredients', { 
                  ingredient_id: '',
                  name: '', 
                  quantity: '', 
                  unit: '', 
                  notes: '' 
                })}
              >
                + Добавить ингредиент
              </button>
            </div>
          )}

          {activeStep === 3 && (
            <div className="form-step">
              <h2>Пошаговое приготовление</h2>
              
              <div className="instructions-list">
                {recipeData.instructions.map((instruction, index) => (
                  <div key={index} className="instruction-step">
                    <div className="step-header">
                      <span className="step-number">Шаг {index + 1}</span>
                      {recipeData.instructions.length > 1 && (
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => removeArrayItem('instructions', index)}
                        >
                          ❌
                        </button>
                      )}
                    </div>
                    <textarea
                      placeholder="Опишите этот шаг приготовления... *"
                      value={instruction.instruction}
                      onChange={(e) => handleArrayChange('instructions', index, 'instruction', e.target.value)}
                      rows="3"
                      required
                    />
                    <div className="step-extra">
                      <input
                        type="number"
                        placeholder="Время (мин)"
                        value={instruction.duration}
                        onChange={(e) => handleArrayChange('instructions', index, 'duration', e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="add-more-btn"
                onClick={() => addArrayItem('instructions', { 
                  step_number: recipeData.instructions.length + 1, 
                  instruction: '', 
                  duration: ''
                })}
              >
                + Добавить шаг
              </button>
            </div>
          )}

          {activeStep === 4 && (
            <div className="form-step">
              <h2>Дополнительная информация</h2>
              
              <div className="form-group">
                <label>Теги (через запятую)</label>
                <input
                  type="text"
                  placeholder="например: итальянская, паста, быстро"
                  onChange={(e) => handleInputChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                />
              </div>

              <div className="form-group">
                <label>Необходимое оборудование (через запятую)</label>
                <input
                  type="text"
                  placeholder="например: кастрюля, сковорода, блендер"
                  onChange={(e) => handleInputChange('cooking_equipment', e.target.value.split(',').map(item => item.trim()).filter(item => item))}
                />
              </div>

              <div className="final-preview">
                <h3>Предпросмотр рецепта</h3>
                <div className="preview-content">
                  <p><strong>Название:</strong> {recipeData.title}</p>
                  <p><strong>Категория:</strong> {categories.find(c => c.id === parseInt(recipeData.category_id))?.name}</p>
                  <p><strong>Порций:</strong> {recipeData.servings}</p>
                  <p><strong>Ингредиентов:</strong> {recipeData.ingredients.filter(ing => ing.name.trim()).length}</p>
                  <p><strong>Шагов приготовления:</strong> {recipeData.instructions.filter(inst => inst.instruction.trim()).length}</p>
                </div>
              </div>
            </div>
          )}

          <div className="form-navigation">
            {activeStep > 1 && (
              <button type="button" className="nav-btn prev" onClick={prevStep}>
                ← Назад
              </button>
            )}
            
            {activeStep < 4 ? (
              <button type="button" className="nav-btn next" onClick={nextStep}>
                Далее →
              </button>
            ) : (
              <button type="submit" className="nav-btn submit" disabled={loading || !isFormComplete()}>
                {loading ? 'Сохранение...' : '🍳 Опубликовать рецепт'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRecipe;