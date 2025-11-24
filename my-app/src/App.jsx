import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { AdminOnly } from "./components/guards/RoleGuard.simple.jsx";
import RootLayout from "./layouts/RootLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import Home from "./pages/Home.jsx";
import Frames from "./pages/Frames.jsx";
import TakeMoment from "./pages/TakeMoment.jsx";
import Editor from "./pages/Editor.jsx";
import EditPhoto from "./pages/EditPhoto.jsx";
import EditPhotoTest from "./pages/EditPhotoTest.jsx";
import TabletPrinter from "./pages/TabletPrinter.jsx";
import FrameDebugSimple from "./pages/FrameDebugSimple.jsx";
import FrameBuilder from "./pages/FrameBuilder.jsx";
import Create from "./pages/Create.jsx";
import NotFound from "./pages/NotFound.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Profile from "./pages/Profile.jsx";
import Settings from "./pages/Settings.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import Wishlist from "./pages/Wishlist.jsx";
import Drafts from "./pages/Drafts.jsx";

// Footer Pages
import HelpCenter from "./pages/HelpCenter.jsx";
import CallCenter from "./pages/CallCenter.jsx";
import OrderStatus from "./pages/OrderStatus.jsx";
import AboutUs from "./pages/AboutUs.jsx";
import Investor from "./pages/Investor.jsx";
import Affiliates from "./pages/Affiliates.jsx";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminFrames from "./pages/admin/AdminFrames.jsx";
import AdminUploadFrame from "./pages/admin/AdminUploadFrame.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";
import AdminCategories from "./pages/admin/AdminCategories.jsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.jsx";
import AdminMessages from "./pages/admin/AdminMessages.jsx";

import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* layout di root */}
          <Route path="/" element={<RootLayout />}>
            {/* "/" */}
            <Route index element={<Home />} />

            {/* Public routes */}
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="reset-password" element={<ResetPassword />} />

            {/* Footer pages */}
            <Route path="help-center" element={<HelpCenter />} />
            <Route path="call-center" element={<CallCenter />} />
            <Route path="order-status" element={<OrderStatus />} />
            <Route path="about-us" element={<AboutUs />} />
            <Route path="investor" element={<Investor />} />
            <Route path="affiliates" element={<Affiliates />} />

            {/* Protected routes */}
            <Route
              path="frames"
              element={
                <ProtectedRoute>
                  <Frames />
                </ProtectedRoute>
              }
            />
            <Route
              path="create"
              element={
                <ProtectedRoute>
                  <Create />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="drafts"
              element={
                <ProtectedRoute>
                  <Drafts />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="change-password"
              element={
                <ProtectedRoute>
                  <ChangePassword />
                </ProtectedRoute>
              }
            />
            <Route
              path="wishlist"
              element={
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              }
            />
            <Route
              path="take-moment"
              element={
                <ProtectedRoute>
                  <TakeMoment />
                </ProtectedRoute>
              }
            />
            <Route path="editor" element={<Editor />} />
            <Route path="edit-photo" element={<EditPhoto />} />
            <Route
              path="frame-debug"
              element={
                <ProtectedRoute>
                  <FrameDebugSimple />
                </ProtectedRoute>
              }
            />
            <Route
              path="frame-builder"
              element={
                <ProtectedRoute>
                  <FrameBuilder />
                </ProtectedRoute>
              }
            />

            {/* 404 untuk semua yang tidak match */}
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Admin Routes - Separate Layout */}
          <Route
            path="/admin"
            element={
              <AdminOnly>
                <AdminLayout />
              </AdminOnly>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="frames" element={<AdminFrames />} />
            <Route path="upload-frame" element={<AdminUploadFrame />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Tablet Printer - Full Screen Route (No Layout) */}
          <Route
            path="/tablet-printer"
            element={
              <ProtectedRoute>
                <TabletPrinter />
              </ProtectedRoute>
            }
          />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
