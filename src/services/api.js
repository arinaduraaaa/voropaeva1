import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const authService = {
  login: (credentials) => axios.post(`${API_URL}/auth/login`, credentials),
  register: (userData) => axios.post(`${API_URL}/auth/register`, userData)
};

export const userService = {
  getProfile: (token) => axios.get(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  updateProfile: (data, token) => axios.patch(`${API_URL}/users/me`, data, {
    headers: { Authorization: `Bearer ${token}` }
  })
};