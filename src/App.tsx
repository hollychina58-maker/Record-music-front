import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { Layout } from './components/Layout';
import { useLanguage } from './i18n/LanguageContext';
import { HomePage } from './pages/HomePage';
import { CreateStoryPage } from './pages/CreateStoryPage';
import { StoryDetailPage } from './pages/StoryDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { PaymentPage } from './pages/PaymentPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { MySpacePage } from './pages/MySpacePage';

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const Dashboard = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.Dashboard })));
const AdminStoriesPage = lazy(() => import('./pages/admin/AdminStoriesPage').then(m => ({ default: m.AdminStoriesPage })));
const AdminCommentsPage = lazy(() => import('./pages/admin/AdminCommentsPage').then(m => ({ default: m.AdminCommentsPage })));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage').then(m => ({ default: m.AdminProductsPage })));

function AdminFallback() {
  return <div style={{ display:'flex',justifyContent:'center',padding:'80px 0',color:'#bbb',fontFamily:'"Noto Serif SC",serif' }}>加载中...</div>;
}

function App() {
  const { language, dir } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/create" element={<CreateStoryPage />} />
          <Route path="/story/:id" element={<StoryDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/my-space" element={<MySpacePage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/admin" element={<Suspense fallback={<AdminFallback />}><AdminLayout /></Suspense>}>
            <Route index element={<Suspense fallback={<AdminFallback />}><Dashboard /></Suspense>} />
            <Route path="stories" element={<Suspense fallback={<AdminFallback />}><AdminStoriesPage /></Suspense>} />
            <Route path="comments" element={<Suspense fallback={<AdminFallback />}><AdminCommentsPage /></Suspense>} />
            <Route path="users" element={<Suspense fallback={<AdminFallback />}><AdminUsersPage /></Suspense>} />
            <Route path="products" element={<Suspense fallback={<AdminFallback />}><AdminProductsPage /></Suspense>} />
          </Route>
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
