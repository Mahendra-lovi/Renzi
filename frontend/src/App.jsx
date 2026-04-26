import { BrowserRouter, Routes, Route } from "react-router-dom";

import PublicRoute from "./components/PublicRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import MapView from "./pages/MapView";
import ItemDetails from "./pages/ItemDetails";
import AddItem from "./pages/AddItem";
import MyListings from "./pages/MyListings";
import MyRentals from "./pages/MyRentals";
import OwnerRequests from "./pages/OwnerRequests";
import AdminRoute from "./components/AdminRoute";
import AdminDashboard from "./pages/AdminDashboard";
import { LiveLocationProvider } from "./context/LiveLocationContext";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 🔓 PUBLIC ROUTES */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />

        {/* 🔐 PROTECTED ROUTES (NOTE: path="/" IS REQUIRED) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <LiveLocationProvider>
                <Layout />
              </LiveLocationProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="map" element={<MapView />} />
          <Route path="profile" element={<Profile />} />
          <Route path="items/:id" element={<ItemDetails />} />
          <Route path="add-item" element={<AddItem />} />
          <Route path="my-listings" element={<MyListings />} />
          <Route path="my-rentals" element={<MyRentals />} />
          <Route path="owner-requests" element={<OwnerRequests />} />
          <Route path="admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
