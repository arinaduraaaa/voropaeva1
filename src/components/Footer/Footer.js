import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>🍳 CookShare</h3>
          <p>Платформа для обмена кулинарными рецептами и идеями для приготовления блюд</p>
        </div>
        
        <div className="footer-section">
          <h4>Навигация</h4>
          <ul>
            <li><a href="/">Главная</a></li>
            <li><a href="/search">Поиск рецептов</a></li>
            <li><a href="/categories">Категории</a></li>
            <li><a href="/cuisines">Кухни мира</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Сообщество</h4>
          <ul>
            <li><a href="/about">О нас</a></li>
            <li><a href="/contacts">Контакты</a></li>
            <li><a href="/guidelines">Правила</a></li>
            <li><a href="/contribute">Добавить рецепт</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Статистика</h4>
          <div className="stats">
            <div className="stat-item">
              <span className="stat-number">1,234+</span>
              <span className="stat-label">Рецептов</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">567+</span>
              <span className="stat-label">Поваров</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">89+</span>
              <span className="stat-label">Кухонь</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; 2024 CookShare. Все права защищены.</p>
      </div>
    </footer>
  );
};

export default Footer;