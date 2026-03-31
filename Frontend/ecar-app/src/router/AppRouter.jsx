import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import Login from "../components/Login";
import Signup from "../components/Signup";
import { UserNavbar } from "../components/user/UserNavbar";
import { AdminSidebar } from "../components/admin/AdminSidebar";
import Home from "../pages/user/Home";
import SearchCars from "../pages/user/SearchCars";
import CompareCars from "../pages/user/CompareCars";
import ManageCars from "../pages/admin/ManageCars";
import CarDetail from "../pages/user/CarDetail";

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  {
    path: "/user", element: <UserNavbar />,
    children: [
      {
        path: "search", element:
          <SearchCars />
      },
      {
        path: "compare", element:
          <CompareCars />
      },
    ]
  },
  {
    path: "/admin", element: <AdminSidebar />,
    children: [
      { path: "managecars", element: <ManageCars /> }
    ]
  },
  { path: "car/:id", element: <CarDetail /> }
])

const AppRouter = () => {
  return <RouterProvider router={router} />
}

export default AppRouter