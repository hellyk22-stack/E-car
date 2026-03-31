import React, { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";

export const AdminSidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      <div className={`bg-gray-900 text-white p-5 transition-all duration-300 ${isOpen ? "w-64" : "w-16"}`}>
        <button className="mb-6 text-white text-xl" onClick={() => setIsOpen(!isOpen)}>
          ☰
        </button>
        {isOpen && <h2 className="text-lg font-bold mb-6 text-blue-400">E-CAR Admin</h2>}
        <ul className="space-y-4 font-medium">
          <li>
            <Link to="/admin/managecars" className="block hover:text-blue-400">
              {isOpen ? "Manage Cars" : "🚗"}
            </Link>
          </li>
          <li>
            <button
              className="bg-red-500 px-3 py-1 rounded hover:bg-red-600"
              onClick={() => navigate("/")}
            >
              {isOpen ? "Logout" : "🚪"}
            </button>
          </li>
        </ul>
      </div>
      <div className="flex-1 p-6 bg-gray-100">
        <Outlet />
      </div>
    </div>
  );
};