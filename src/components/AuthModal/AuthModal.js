import React, { useState } from 'react';
import { supabase } from '../../client/AuthClient';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    cooking_experience: 'beginner'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Полностью обходим Supabase Auth, работаем только с таблицей profiles
      if (isLogin) {
        // Вход - ищем пользователя по email
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', formData.email)
          .single();

        if (error || !profile) {
          throw new Error('Пользователь с таким email не найден');
        }

        onLogin(profile);
        onClose();
        
      } else {
        // Регистрация - создаем нового пользователя в таблице profiles
        const { data: profile, error } = await supabase
          .from('profiles')
          .insert([
            {
              username: formData.username,
              email: formData.email,
              full_name: formData.full_name,
              cooking_experience: formData.cooking_experience,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new Error('Пользователь с таким email или именем уже существует');
          }
          throw error;
        }

        onLogin(profile);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Произошла ошибка');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      full_name: '',
      cooking_experience: 'beginner'
    });
    setError('');
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <button className="close-btn" onClick={onClose}>×</button>
        
        <h2>{isLogin ? 'Вход' : 'Регистрация'}</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <input
                type="text"
                name="full_name"
                placeholder="Полное имя"
                value={formData.full_name}
                onChange={handleChange}
                required={!isLogin}
              />
              <select
                name="cooking_experience"
                value={formData.cooking_experience}
                onChange={handleChange}
                required={!isLogin}
              >
                <option value="beginner">Начинающий</option>
                <option value="intermediate">Опытный</option>
                <option value="expert">Шеф-повар</option>
              </select>
              <input
                type="text"
                name="username"
                placeholder="Имя пользователя"
                value={formData.username}
                onChange={handleChange}
                required={!isLogin}
              />
            </>
          )}
          
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          
          {/* Поле password оставляем для формы, но не используем для аутентификации */}
          <input
            type="password"
            name="password"
            placeholder="Пароль"
            value={formData.password}
            onChange={handleChange}
            required
            minLength="6"
          />
          
          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>
        
        <p className="toggle-auth">
          {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
          <span onClick={handleToggleMode} className="toggle-link">
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;