"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import sarthakLogo from "../assets/sarthak_logo.jpg"

const LoginPage = () => {
  const navigate = useNavigate()
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })
  const [toast, setToast] = useState({ show: false, message: "", type: "" })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoginLoading(true)

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', formData.username.trim())
        .maybeSingle()

      if (error && error.code !== 'PGRST116') { // PGRST116 is the code for "multiple (or no) rows returned" if using single() sometimes, but maybeSingle suppresses it for "no rows".
        console.error("Login Error:", error)
        showToast(`Error: ${error.message}`, "error")
        return
      }

      if (!user) {
        showToast("Username not found.", "error")
        return
      }

      // Check password (plain text as per current schema)
      if (user.password === formData.password.trim()) {
        if (user.status === 'inactive') {
          showToast("Account is inactive. Please contact admin.", "error")
          return
        }

        // Store user info
        sessionStorage.setItem('username', user.username)
        sessionStorage.setItem('role', user.role)
        sessionStorage.setItem('department', user.department || '')

        // Store Permissions
        const accessRights = user.role === 'admin'
          ? 'all'
          : (user.user_access || '')
        sessionStorage.setItem('user_access', accessRights)

        showToast(`Login successful. Welcome, ${user.full_name || user.username}!`, "success")

        // Redirect to appropriate dashboard based on role
        const dashboardPath = user.role === 'admin' ? '/dashboard/admin' : '/dashboard/user'
        navigate(dashboardPath)
      } else {
        showToast("Invalid password.", "error")
      }
    } catch (error) {
      console.error("Login Error:", error)
      showToast(`Login failed: ${error.message}`, "error")
    } finally {
      setIsLoginLoading(false)
    }
  }

  const showToast = (message, type) => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" })
    }, 5000)
  }

  return (
    <div className="flex min-h-screen w-full font-sans bg-white">
      {/* Left Text/Logo Section */}
      <div className="hidden lg:flex w-1/2 bg-white flex-col justify-center items-center relative p-12 overflow-hidden border-r border-gray-100">
        <div className="relative z-10 w-full max-w-lg">
          <img
            src={sarthakLogo}
            alt="Sarthak TMT Logo"
            className="w-full h-auto object-contain hover:scale-[1.02] transition-transform duration-500"
          />
        </div>
        {/* Decorative background elements if needed, keeping it clean for now */}
      </div>

      {/* Right Login Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-gray-50/30">
        <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 sm:p-10 animate-in fade-in slide-in-from-right-8 duration-700">

          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 text-[#991B1B] mb-5 shadow-sm ring-1 ring-red-100">
              <i className="fas fa-clipboard-check text-2xl"></i>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome Back</h1>
            <p className="text-sm text-gray-500 mt-2.5 font-medium">Sign in to Sarthak TMT Checklist Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-400 ml-1">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="fas fa-user text-gray-300 group-focus-within:text-[#991B1B] transition-colors text-sm"></i>
                </div>
                <input
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#991B1B] focus:ring-4 focus:ring-red-50/50 transition-all bg-gray-50/30 hover:bg-white"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-400 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="fas fa-lock text-gray-300 group-focus-within:text-[#991B1B] transition-colors text-sm"></i>
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#991B1B] focus:ring-4 focus:ring-red-50/50 transition-all bg-gray-50/30 hover:bg-white"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoginLoading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-red-900/10 text-sm font-bold text-white bg-[#991B1B] hover:bg-[#7f1616] hover:shadow-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#991B1B] disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98] tracking-wide"
              >
                {isLoginLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>
          </form>

          {/* Simple Footer */}
          <div className="mt-8 text-center">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
              Powered by <a href="https://www.botivate.in/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#991B1B] transition-colors">Botivate</a>
            </p>
          </div>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toast.show && (
        <div className={`fixed top-6 left-1/2 lg:left-3/4 transform -translate-x-1/2 px-5 py-3 rounded-full shadow-xl border transition-all duration-300 z-50 flex items-center gap-3 animate-in slide-in-from-top-4 ${toast.type === "success"
          ? "bg-white text-emerald-700 border-emerald-100 shadow-emerald-100/50"
          : "bg-white text-red-700 border-red-100 shadow-red-100/50"
          }`}>
          <div className={`w-2.5 h-2.5 rounded-full ${toast.type === "success" ? "bg-emerald-500" : "bg-red-500"}`}></div>
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}
    </div>
  )
}

export default LoginPage