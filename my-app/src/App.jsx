import { Routes, Route } from "react-router-dom";
import RootLayout from "./layouts/RootLayout.jsx";
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Frames from "./pages/Frames.jsx";
import TakeMoment from "./pages/TakeMoment.jsx";
import Editor from "./pages/Editor.jsx";
import EditPhoto from "./pages/EditPhoto.jsx";
import TabletPrinter from "./pages/TabletPrinter.jsx";
import FrameDebugSimple from "./pages/FrameDebugSimple.jsx";
import FrameBuilder from "./pages/FrameBuilder.jsx";
import Create from "./pages/Create.jsx";
import NotFound from "./pages/NotFound.jsx";
import "./App.css";

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/frames" element={<Frames />} />
    <Route path="/create" element={<Create />} />
        <Route path="/take-moment" element={<TakeMoment />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/edit-photo" element={<EditPhoto />} />
        <Route path="/frame-debug" element={<FrameDebugSimple />} />
        <Route path="/frame-builder" element={<FrameBuilder />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      {/* Tablet Printer - Full Screen Route (No Layout) */}
      <Route path="/tablet-printer" element={<TabletPrinter />} />
    </Routes>
  );
}
