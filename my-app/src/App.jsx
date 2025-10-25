import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import RootLayout from "./layouts/RootLayout.jsx";
import Home from "./pages/Home.jsx";
import Frames from "./pages/Frames.jsx";
import TakeMoment from "./pages/TakeMoment.jsx";
import Editor from "./pages/Editor.jsx";
import EditPhoto from "./pages/EditPhoto.jsx";
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
            element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            }
          />
          <Route
            path="edit-photo"
            element={
              <ProtectedRoute>
                <EditPhoto />
              </ProtectedRoute>
            }
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
