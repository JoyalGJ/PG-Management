import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./Pages/Home";
import RoomsPage from "./Pages/RoomsPage";
import TenantsPage from "./Pages/TenantsPage";
import RentPage from "./Pages/RentPage";
import MaintenancePage from "./Pages/MaintenancePage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow px-6 py-3 flex gap-4">
          <Link to="/" className="font-semibold">Home</Link>
          <Link to="/rooms">Rooms</Link>
          <Link to="/tenants">Tenants</Link>
          <Link to="/rent">Rent</Link>
          <Link to="/maintenance">Maintenance</Link>
        </nav>

        <div className="p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/rent" element={<RentPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
