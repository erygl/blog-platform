import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Home from './pages/Home.tsx'
import ResetPassword from './pages/ResetPassword.tsx'
import EmailVerified from './pages/EmailVerified.tsx'

const router = createBrowserRouter([
  { index: true, element: <Home /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/email-verified", element: <EmailVerified /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
