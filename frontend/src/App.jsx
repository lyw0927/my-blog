import { createContext, useState, useEffect, useContext } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PostPage from './pages/PostPage';
import WritePage from './pages/WritePage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import Navbar from './components/Navbar';
import CardTooltip from './components/CardTooltip';
import { checkAdminAuth, getSettings } from './api';
import './index.css';

export const BlogContext = createContext();

export function useBlog() {
  return useContext(BlogContext);
}

function AppContent() {
  const [user, setUser] = useState(null); // stores { username, nickname, role }
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'ko');
  const [settings, setSettings] = useState({
    blogTitle: "마술사 덱 노트",
    logoEmoji: "🃏",
    logoImageUrl: "",
    subtitle: "유희왕 마술사 계열 덱 구성, 매치업, 전략을 기록하는 덱 노트"
  });

  const refreshSettings = () => {
    getSettings().then((data) => {
      setSettings(data);
      if (data.blogTitle && lang === 'ko') {
        document.title = data.blogTitle;
      }
    }).catch(console.error);
  };

  useEffect(() => {
    checkAdminAuth().then(setUser);
    refreshSettings();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-mode');
    } else {
      root.classList.remove('light-mode');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 언어 변경 시 문서 타이틀 처리
  useEffect(() => {
    if (lang === 'en') {
      document.title = "Magician Deck Notes";
    } else if (lang === 'ja') {
      document.title = "魔術師デッキノート";
    } else {
      document.title = settings.blogTitle || "마술사 덱 노트";
    }
    localStorage.setItem('lang', lang);
  }, [lang, settings.blogTitle]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const changeLanguage = (newLang) => {
    setLang(newLang);
  };

  const isAdmin = user?.role === 'admin';
  const isLoggedIn = !!user;

  return (
    <BlogContext.Provider value={{ user, setUser, isAdmin, isLoggedIn, theme, toggleTheme, settings, refreshSettings, lang, changeLanguage }}>
      <BrowserRouter>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <CardTooltip />
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/posts/:id" element={<PostPage />} />
              <Route path="/write" element={<WritePage />} />
              <Route path="/write/:id" element={<WritePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </BlogContext.Provider>
  );
}

export default function App() {
  return <AppContent />;
}
