import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import Home from './pages/Home/Home';
import Search from './pages/Search/Search';
import RecipeDetail from './pages/RecipeDetail/RecipeDetail';
import AddRecipe from './pages/AddRecipe/AddRecipe';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/recipe/:id" element={<RecipeDetail />} />
            <Route path="/add-recipe" element={<AddRecipe />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;