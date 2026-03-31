import React, { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";

export const UserNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <nav className="bg-white shadow-md px-6 py-3 sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-500">E-CAR 🚗</h1>
          <ul className="hidden md:flex gap-6 items-center font-medium">
            <li><Link to="/" className="hover:text-blue-500">Home</Link></li>
            <li><Link to="/user/search" className="hover:text-blue-500">Search Cars</Link></li>
            <li><Link to="/user/compare" className="hover:text-blue-500">Compare Cars</Link></li>
            <li>
              <button
                className="bg-blue-500 text-white px-4 py-1 rounded-lg hover:bg-blue-600"
                onClick={() => navigate("/")}
              >
                Logout
              </button>
            </li>
          </ul>
          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>☰</button>
        </div>
        {isOpen && (
          <ul className="md:hidden flex flex-col mt-4 gap-3 font-medium">
            <li><Link to="/user/home">Home</Link></li>
            <li><Link to="/user/search">Search Cars</Link></li>
            <li><Link to="/user/compare">Compare Cars</Link></li>
            <li>
              <button
                className="bg-blue-500 text-white px-4 py-1 rounded-lg"
                onClick={() => navigate("/")}
              >
                Logout
              </button>
            </li>
          </ul>
        )}
      </nav>
      <div className="p-6 bg-gray-100 min-h-[calc(100vh-64px)]">
        <Outlet />
      </div>
    </>
  );
};