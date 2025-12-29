"use client"

import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom"
import { supabase } from "./supabase"
import LoginPage from "./pages/LoginPage"
import AdminDashboard from "./pages/admin/Dashboard"
import AdminAssignTask from "./pages/admin/AssignTask"
import AdminApproval from "./pages/admin/AdminApproval"

import "./index.css"
import License from "./pages/License"
import TrainingVideo from "./pages/TrainingVideo"
import Settings from "./pages/admin/Settings"
import UserDashboard from "./pages/user/Dashboard"
import UserTasks from "./pages/user/Tasks"
import CalendarPage from "./pages/CalendarPage"

import HouseKeepingData from "./components/data/HouseKeepingData"
import StoreData from "./components/data/StoreData"
import AccountData from "./components/data/AccountData"
import SecurityData from "./components/data/SecurityData"
import SlagCrusherData from "./components/data/SlagCrusherData"
import HRData from "./components/data/HRData"
import MGMTData from "./components/data/MGMTData"
import HealthAndSafetyData from "./components/data/HealthAndSafetyData"




// Component to redirect to appropriate dashboard based on role
const DashboardRedirect = () => {
  const role = sessionStorage.getItem("role")
  const targetPath = role === 'admin' ? '/dashboard/admin' : '/dashboard/user'
  return <Navigate to={targetPath} replace />
}

// Auth wrapper component to protect routes
const ProtectedRoute = ({ children, allowedRoles = [], requiredPermission = null }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const username = sessionStorage.getItem("username")

  useEffect(() => {
    const checkAccess = async () => {
      if (!username) {
        setLoading(false)
        return
      }

      try {
        // Fetch latest user data
        const { data: user, error } = await supabase
          .from('users')
          .select('role, user_access, status')
          .eq('username', username)
          .single()

        if (error || !user) {
          console.error("Error verifying user:", error)
          // If error (or user deleted), potentially deny access or rely on session?
          // Safest is to deny if we can't verify.
          setLoading(false)
          return
        }

        if (user.status === 'inactive') {
          sessionStorage.clear()
          navigate('/login')
          return
        }

        // Update local session storage to match DB
        const accessRights = user.role === 'admin' ? 'all' : (user.user_access || '')
        sessionStorage.setItem('role', user.role)
        sessionStorage.setItem('user_access', accessRights)

        // Check Permissions
        let authorized = true

        // Role check
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
          authorized = false
        }

        // Permission check
        if (requiredPermission && user.role !== 'admin') {
          const permissions = accessRights ? accessRights.split(',') : []
          if (!permissions.includes(requiredPermission)) {
            authorized = false
          }
        }

        setIsAuthorized(authorized)
      } catch (err) {
        console.error("Auth check failed:", err)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [username, navigate, allowedRoles, requiredPermission])

  if (!username) {
    return <Navigate to="/login" replace />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#991B1B]"></div>
          <p className="text-sm text-gray-500">Verifying access...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    const role = sessionStorage.getItem('role')
    const dashboardPath = role === 'admin' ? '/dashboard/admin' : '/dashboard/user'

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-[#991B1B] font-bold p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
          <h2 className="text-xl mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500 font-normal">
            You do not have permission to view the <span className="font-semibold text-gray-700">{requiredPermission || 'requested'}</span> page.
          </p>
          <button
            onClick={() => navigate(dashboardPath)}
            className="mt-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return children
}

function App() {

  return (
    <Router>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Login route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Dashboard redirect - redirects to appropriate dashboard based on role */}
        <Route path="/dashboard" element={<DashboardRedirect />} />

        {/* Admin Dashboard route */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute requiredPermission="dashboard" allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* User Dashboard route */}
        <Route
          path="/dashboard/user"
          element={
            <ProtectedRoute requiredPermission="dashboard">
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        {/* User Tasks route */}
        <Route
          path="/dashboard/user/tasks"
          element={
            <ProtectedRoute requiredPermission="dashboard">
              <UserTasks />
            </ProtectedRoute>
          }
        />



        {/* HouseKeeping Data Route */}
        <Route
          path="/dashboard/data/housekeeping"
          element={
            <ProtectedRoute requiredPermission="dashboard">
              <HouseKeepingData />
            </ProtectedRoute>
          }
        />

        {/* Store Data Route */}
        <Route
          path="/dashboard/data/store"
          element={
            <ProtectedRoute requiredPermission="dashboard">
              <StoreData />
            </ProtectedRoute>
          }
        />

        {/* Account Data Route */}
        <Route
          path="/dashboard/data/account"
          element={
            <ProtectedRoute requiredPermission="dashboard">
              <AccountData />
            </ProtectedRoute>
          }
        />

        {/* Security Data Route */}
        <Route
          path="/dashboard/data/security"
          element={
            <ProtectedRoute requiredPermission="dashboard">
              <SecurityData />
            </ProtectedRoute>
          }
        />

        {/* Slag Crusher Data Route */}
        <Route
          path="/dashboard/data/slag-crusher"
          element={
            <ProtectedRoute requiredPermission="dashboard">
              <SlagCrusherData />
            </ProtectedRoute>
          }
        />

        {/* HR Data Route */}
        <Route
          path="/dashboard/data/hr"
          element={
            <ProtectedRoute requiredPermission="dashboard">
              <HRData />
            </ProtectedRoute>
          }
        />

        {/* MGMT Data Route */}
        <Route
          path="/dashboard/data/mgmt"
          element={
            <ProtectedRoute requiredPermission="dashboard">
              <MGMTData />
            </ProtectedRoute>
          }
        />

        {/* Health and Safety Data Route */}
        <Route
          path="/dashboard/data/health-and-safety"
          element={
            <ProtectedRoute requiredPermission="dashboard">
              <HealthAndSafetyData />
            </ProtectedRoute>
          }
        />





        {/* Assign Task route */}
        <Route
          path="/dashboard/assign-task"
          element={
            <ProtectedRoute requiredPermission="assign_task">
              <AdminAssignTask />
            </ProtectedRoute>
          }
        />

        {/* Admin Approval route */}
        <Route
          path="/dashboard/admin/approval"
          element={
            <ProtectedRoute requiredPermission="assign_task" allowedRoles={['admin']}>
              <AdminApproval />
            </ProtectedRoute>
          }
        />


        <Route
          path="/dashboard/license"
          element={
            <ProtectedRoute requiredPermission="license">
              <License />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/traning-video"
          element={
            <ProtectedRoute requiredPermission="training">
              <TrainingVideo />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/settings"
          element={
            <ProtectedRoute requiredPermission="profile">
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/calendar"
          element={
            <ProtectedRoute requiredPermission="dashboard">
              <CalendarPage />
            </ProtectedRoute>
          }
        />



        {/* Backward compatibility redirects */}
        <Route path="/admin/*" element={<Navigate to="/dashboard/admin" replace />} />
        <Route path="/admin/dashboard" element={<Navigate to="/dashboard/admin" replace />} />
        <Route path="/admin/assign-task" element={<Navigate to="/dashboard/assign-task" replace />} />

        <Route path="/admin/license" element={<Navigate to="/dashboard/license" replace />} />
        <Route path="/admin/traning-video" element={<Navigate to="/dashboard/traning-video" replace />} />
        <Route path="/user/*" element={<Navigate to="/dashboard/admin" replace />} />
      </Routes>
    </Router>
  )
}

export default App