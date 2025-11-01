import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AuthModal from '../AuthModal/AuthModal';
import ProfileModal from '../ProfileModal/ProfileModal';
import './Header.css';

const Header = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Проверяем сохраненные данные пользователя при загрузке
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setCurrentUser(userData);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setIsLoggedIn(true);
    setCurrentUser(userData);
    // Сохраняем данные пользователя в localStorage
    localStorage.setItem('currentUser', JSON.stringify(userData));
    setIsAuthModalOpen(false);
    console.log('User logged in:', userData);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    // Удаляем данные пользователя из localStorage
    localStorage.removeItem('currentUser');
    setIsProfileModalOpen(false);
  };

  const handleProfileUpdate = (updatedProfile) => {
    setCurrentUser(updatedProfile);
    // Обновляем данные в localStorage
    localStorage.setItem('currentUser', JSON.stringify(updatedProfile));
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/" className="logo-link">
            <h1>🍳 CookShare</h1>
          </Link>
        </div>
        
        <nav className="nav">
          <Link to="/" className="nav-link">Главная</Link>
          <Link to="/search" className="nav-link">Поиск</Link>
          <Link to="/add-recipe" className="nav-link">Добавить рецепт</Link>
         
        </nav>

        <div className="header-actions">
          {isLoggedIn ? (
            <div className="user-menu">
              <button 
                className="profile-btn"
                onClick={() => setIsProfileModalOpen(true)}
              >
                <span className="user-avatar">👤</span>
                <span className="user-name">
                  {currentUser?.username || currentUser?.full_name || 'Профиль'}
                </span>
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button 
                className="login-btn"
                onClick={() => setIsAuthModalOpen(true)}
              >
                Войти
              </button>
              <button 
                className="register-btn"
                onClick={() => {
                  setIsAuthModalOpen(true);
                  // Можно добавить логику для автоматического переключения на регистрацию
                }}
              >
                Регистрация
              </button>
            </div>
          )}
        </div>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleLogin}
      />

      <ProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onLogout={handleLogout}
        user={currentUser}
        onProfileUpdate={handleProfileUpdate}
      />
    </header>
  );
};

export default Header;