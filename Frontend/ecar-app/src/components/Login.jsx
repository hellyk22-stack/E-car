import axios from "axios";
import React from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function Login() {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm();

const submitHandler = async (data) => {
    try {
      const res = await axios.post("/user/login", data)
      if (res.status == 200) {
        toast.success("Login success")
        localStorage.setItem("token", res.data.token)
        localStorage.setItem("role", res.data.role)
        if (res.data.role == "admin") {
          navigate("/admin/managecars")
        } else {
          navigate("/user/search")
        }
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response.data.message)
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex w-1/2 h-screen">
        <img
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7"
          alt="cars"
          className="object-cover w-full h-full"
        />
      </div>
      <div className="flex items-center justify-center w-full md:w-1/2 px-6">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold mb-2">Welcome to E-CAR 🚗</h2>
          <p className="text-gray-500 mb-6">Please login to continue</p>
          <form onSubmit={handleSubmit(submitHandler)} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 6, message: "Minimum 6 characters" }
                })}
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition">
              Login
            </button>
            <p className="text-center text-gray-500">Don't have an account? <a href="/signup" className="text-blue-500">Signup</a></p>
          </form>
        </div>
      </div>
    </div>
  );
}