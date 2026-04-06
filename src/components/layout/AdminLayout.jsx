"use client"

import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { CheckSquare, ClipboardList, Menu, Database, KeyRound, Video, Settings, ListTodo, FileCheck, Calendar, User, Share2 } from 'lucide-react'
import Sidebar from "./Sidebar"

export default function AdminLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const [username, setUsername] = useState("")
  const [userRole, setUserRole] = useState("")

  // Check authentication on component mount
  useEffect(() => {
    const storedUsername = sessionStorage.getItem('username')
    const storedRole = sessionStorage.getItem('role')

    if (!storedUsername) {
      // Redirect to login if not authenticated
      navigate("/login")
      return
    }

    setUsername(storedUsername)
    setUserRole(storedRole || "user")
  }, [navigate])

  // Handle logout
  const handleLogout = () => {
    sessionStorage.removeItem('username')
    sessionStorage.removeItem('role')
    sessionStorage.removeItem('department')
    navigate("/login")
  }

  // Filter dataCategories based on user role
  const dataCategories = [
    { id: "housekeeping", name: "HouseKeeping", link: "/dashboard/data/housekeeping" },
    { id: "store", name: "Store", link: "/dashboard/data/store" },
    { id: "account", name: "Account", link: "/dashboard/data/account" },
    { id: "admin", name: "Admin", link: "/dashboard/data/admin" },
    { id: "security", name: "Security", link: "/dashboard/data/security" },
    // { id: "slag-crusher", name: "Slag Crusher", link: "/dashboard/data/slag-crusher" },
    { id: "hr", name: "HR", link: "/dashboard/data/hr" },
    { id: "mgmt", name: "MGMT", link: "/dashboard/data/mgmt" },
    { id: "health-and-safety", name: "Health and Safety", link: "/dashboard/data/health-and-safety" },
  ]



  // Update the routes array based on user role
  const dashboardPath = userRole === 'admin' ? '/dashboard/admin' : '/dashboard/user'

  const routes = [
    {
      href: dashboardPath,
      label: "Dashboard",
      icon: Database,
      active: location.pathname === dashboardPath,
      showFor: ["admin", "user"],
      permission: "dashboard"
    },
    {
      href: "/dashboard/user/tasks",
      label: "My Tasks",
      icon: ListTodo,
      active: location.pathname === "/dashboard/user/tasks",
      showFor: ["user"], 
      permission: "tasks"
    },
    {
      href: "/dashboard/assign-task",
      label: "Assign Task",
      icon: CheckSquare,
      active: location.pathname === "/dashboard/assign-task",
      showFor: ["admin", "user"],
      permission: "assign_task"
    },
    {
      href: "/dashboard/admin/approval",
      label: "Admin Approval",
      icon: FileCheck,
      active: location.pathname === "/dashboard/admin/approval",
      showFor: ["admin"],
      permission: "admin_approval"
    },
    {
      href: "/dashboard/delegated-tasks",
      label: "Delegated Tasks",
      icon: Share2,
      active: location.pathname === "/dashboard/delegated-tasks",
      showFor: ["admin", "user"],
      permission: "delegated_tasks"
    },
    {
      href: "#",
      label: "Department",
      icon: Database,
      active: location.pathname.includes("/dashboard/data"),
      showFor: ["admin", "user"],
      permission: "data_pages",
      submenu: true
    },
    // {
    //   href: "/dashboard/calendar",
    //   label: "Calendar",
    //   icon: Calendar,
    //   active: location.pathname === "/dashboard/calendar",
    //   showFor: ["admin", "user"],
    //   permission: "dashboard"
    // },
    {
      href: "/dashboard/profile",
      label: "My Profile",
      icon: User,
      active: location.pathname === "/dashboard/profile",
      showFor: ["admin", "user"],
      permission: "profile"
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
      active: location.pathname === "/dashboard/settings",
      showFor: ["admin", "user"],
      permission: "settings"
    },
    {
      href: "/dashboard/license",
      label: "License",
      icon: KeyRound,
      active: location.pathname === "/dashboard/license",
      showFor: ["admin", "user"],
      permission: "license"
    },
    {
      href: "/dashboard/traning-video",
      label: "Training Video",
      icon: Video,
      active: location.pathname === "/dashboard/traning-video",
      showFor: ["admin", "user"],
      permission: "training"
    },
  ]

  const getAccessibleDepartments = () => {
    const userRole = sessionStorage.getItem('role') || 'user'
    return dataCategories.filter(cat =>
      !cat.showFor || cat.showFor.includes(userRole)
    )
  }

  // Filter routes based on user role and permissions
  const getAccessibleRoutes = () => {
    const userRole = sessionStorage.getItem('role') || 'user'
    const userAccessStr = sessionStorage.getItem('user_access') || ''

    // Parse permissions
    const userAccess = userAccessStr.split(',').map(p => p.trim())
    const isAdmin = userRole === 'admin'

    return routes.filter(route => {
      // 1. First Check Role Restriction
      if (route.showFor && !route.showFor.includes(userRole)) {
        return false
      }

      // 2. Strict Access Control (Applied to Admin and User)
      // Check if user has explicit 'all' permission
      if (userAccess.includes('all')) return true

      // If a route has a 'permission' key, user MUST have that specific string in their access list
      if (route.permission) {
        if (userAccess.includes(route.permission)) return true
        return false // If they have permission defined but user doesn't have it, hide it
      }

      // Allow routes with no defined permission (General pages like Profile/Logout etc if not marked)
      return true
    })
  }



  // Get accessible routes and departments
  const accessibleRoutes = getAccessibleRoutes()
  const accessibleDepartments = getAccessibleDepartments()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar Component */}
      <Sidebar
        routes={accessibleRoutes}
        departments={accessibleDepartments}
        username={username}
        userRole={userRole}
        onLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden absolute left-4 top-4 z-50 text-foreground p-2 rounded-lg hover:bg-accent transition-colors"
      >
        <Menu className="h-6 w-6" />
      </button>



      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden bg-muted/20">
        <header className="flex md:hidden h-16 items-center justify-center border-b border-border bg-card px-4">
          {/* Spacer is handled by absolute menu button */}
          <span className="font-bold text-primary text-lg whitespace-nowrap">Checklist & Delegation</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {children}

        </main>
        <div className="flex-shrink-0 p-4 border-t border-border bg-card flex items-center justify-center text-xs text-muted-foreground">
          <div className="flex justify-center">
            <a
              href="https://www.botivate.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              Powered by <span className="font-semibold text-[#991B1B]">Botivate</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}