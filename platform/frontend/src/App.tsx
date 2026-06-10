import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import PrivateRoute from './auth/PrivateRoute'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ExercisePage from './pages/ExercisePage'
import KataListPage from './pages/KataListPage'
import ProfilePage from './pages/ProfilePage'
import CoursesPage from './pages/CoursesPage'
import ChatPage from './pages/ChatPage'
import BooksPage from './pages/BooksPage'
import BookReaderPage from './pages/BookReaderPage'
import ConfigPage from './pages/ConfigPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="exercise" element={<KataListPage />} />
            <Route path="exercise/:slug" element={<ExercisePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="chats" element={<ChatPage />} />
            <Route path="books" element={<BooksPage />} />
            <Route path="books/:slug" element={<BookReaderPage />} />
            <Route path="config" element={<ConfigPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
