import axios from "axios";
import React from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function Signup() {
  const navigate = useNavigate()
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch("password");

const onSubmit = async (data) => {
    try {
      const res = await axios.post("/user/register", data)
      if (res.status == 201) {
        toast.success("Signup successful")
        navigate("/login")
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
          src="https://images.unsplash.com/photo-1511919884226-fd3cad34687c"
          alt="cars"
          className="object-cover w-full h-full"
        />
      </div>
      <div className="flex items-center justify-center w-full md:w-1/2 px-6">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold mb-2">Create Account 🚗</h2>
          <p className="text-gray-500 mb-6">Signup to get started</p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Full Name"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
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
            <div>
              <input
                type="password"
                placeholder="Confirm Password"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                {...register("confirmPassword", {
                  required: "Confirm your password",
                  validate: (value) => value === password || "Passwords do not match"
                })}
              />
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
            </div>
            <button type="submit" className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition">
              Signup
            </button>
            <p className="text-center text-gray-500">Already have an account? <a href="/" className="text-blue-500">Login</a></p>
          </form>
        </div>
      </div>
    </div>
  );
}