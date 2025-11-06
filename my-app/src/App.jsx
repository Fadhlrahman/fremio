import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { AdminOnly } from "./components/guards/RoleGuard.simple.jsx";
import RootLayout from "./layouts/RootLayout.jsx";
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
import Profile from "./pages/Profile.jsx";
import Settings from "./pages/Settings.jsx";
import Wishlist from "./pages/Wishlist.jsx";
import Drafts from "./pages/Drafts.jsx";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import KreatorApplications from "./pages/admin/KreatorApplications.jsx";
import AdminFrames from "./pages/admin/AdminFrames.jsx";

import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* layout di root */}
        <Route path="/" element={<RootLayout />}>
          {/* "/" */}
          <Route index element={<Home />} />

          {/* Public routes */}
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />

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
          <Route
            path="editor"
            element={<Editor />}
          />
          <Route
            path="edit-photo"
            element={<EditPhoto />}
          />
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

          {/* Admin Routes */}
          <Route
            path="admin/dashboard"
            element={
              <AdminOnly>
                <AdminDashboard />
              </AdminOnly>
            }
          />
          <Route
            path="admin/applications"
            element={
              <AdminOnly>
                <KreatorApplications />
              </AdminOnly>
            }
          />
          <Route
            path="admin/frames"
            element={
              <AdminOnly>
                <AdminFrames />
              </AdminOnly>
            }
          />

          {/* 404 untuk semua yang tidak match */}
          <Route path="*" element={<NotFound />} />
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
    </AuthProvider>
  );
}
