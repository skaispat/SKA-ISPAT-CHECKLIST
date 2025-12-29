"use client"

import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { ClipboardList, LogOut, ChevronDown, ChevronRight, Menu } from 'lucide-react'

export default function Sidebar({
    routes,
    departments,
    username,
    userRole,
    onLogout,
    isMobileMenuOpen,
    setIsMobileMenuOpen
}) {
    const location = useLocation()
    const [isDataSubmenuOpen, setIsDataSubmenuOpen] = useState(false)

    // Check if the current path is a data category page
    const isDataPage = location.pathname.includes("/dashboard/data/")

    // If it's a data page, expand the submenu by default
    useEffect(() => {
        if (isDataPage && !isDataSubmenuOpen) {
            setIsDataSubmenuOpen(true)
        }
    }, [isDataPage, isDataSubmenuOpen])

    const DesktopSidebar = () => {
        const dashboardPath = userRole === 'admin' ? '/dashboard/admin' : '/dashboard/user'

        return (
            <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-card/50 backdrop-blur-xl md:flex md:flex-col shadow-sm z-10">
                <div className="flex h-16 items-center px-6 border-b border-border">
                    <Link to={dashboardPath} className="flex items-center gap-2 font-bold text-base text-primary tracking-tight hover:opacity-80 transition-opacity whitespace-nowrap">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <ClipboardList className="h-5 w-5" />
                        </div>
                        <span>Checklist & Delegation</span>
                    </Link>
                </div>
                <nav className="flex-1 overflow-y-auto px-4 py-6">
                    <ul className="space-y-1.5">
                        {routes.map((route) => (
                            <li key={route.label}>
                                {route.submenu ? (
                                    <div>
                                        <button
                                            onClick={() => setIsDataSubmenuOpen(!isDataSubmenuOpen)}
                                            className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${route.active
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <route.icon className={`h-4 w-4 ${route.active ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                                                {route.label}
                                            </div>
                                            {isDataSubmenuOpen ? <ChevronDown className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-50" />}
                                        </button>
                                        {isDataSubmenuOpen && (
                                            <ul className="mt-1 ml-4 space-y-1 pl-2 border-l border-border">
                                                {departments.map((category) => (
                                                    <li key={category.id}>
                                                        <Link
                                                            to={category.link || `/dashboard/data/${category.id}`}
                                                            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${location.pathname === (category.link || `/dashboard/data/${category.id}`)
                                                                ? "text-primary font-medium bg-accent/50"
                                                                : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                                                                }`}
                                                        >
                                                            {category.name}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ) : (
                                    <Link
                                        to={route.href}
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${route.active
                                            ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-border"
                                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                            }`}
                                    >
                                        <route.icon className={`h-4 w-4 ${route.active ? "text-primary" : "text-muted-foreground"}`} />
                                        {route.label}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Minimal User Profile */}
                <div className="p-4 border-t border-border">
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary ring-2 ring-background">
                                <span className="text-xs font-bold">{username ? username.charAt(0).toUpperCase() : 'U'}</span>
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-foreground truncate w-24">
                                    {username || "User"}
                                </p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    {userRole === "admin" ? "Admin" : "Member"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onLogout}
                            className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Logout"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </aside>
        )
    }

    const MobileSidebar = () => {
        const dashboardPath = userRole === 'admin' ? '/dashboard/admin' : '/dashboard/user'

        return (
            isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
                    <div className="fixed inset-y-0 left-0 w-72 bg-card shadow-2xl border-r border-border">
                        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
                            <Link
                                to={dashboardPath}
                                className="flex items-center gap-2 font-bold text-lg text-primary whitespace-nowrap"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <ClipboardList className="h-6 w-6" />
                                <span>Checklist & Delegation</span>
                            </Link>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <ChevronRight className="h-6 w-6 rotate-180" />
                            </button>
                        </div>

                        <nav className="flex-1 overflow-y-auto px-4 py-6">
                            <ul className="space-y-1">
                                {routes.map((route) => (
                                    <li key={route.label}>
                                        {route.submenu ? (
                                            <div>
                                                <button
                                                    onClick={() => setIsDataSubmenuOpen(!isDataSubmenuOpen)}
                                                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${route.active
                                                        ? "bg-accent text-accent-foreground"
                                                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <route.icon className={`h-5 w-5 ${route.active ? "text-primary" : ""}`} />
                                                        {route.label}
                                                    </div>
                                                    {isDataSubmenuOpen ? <ChevronDown className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-50" />}
                                                </button>
                                                {isDataSubmenuOpen && (
                                                    <ul className="mt-1 ml-4 space-y-1 border-l border-border pl-2">
                                                        {departments.map((category) => (
                                                            <li key={category.id}>
                                                                <Link
                                                                    to={category.link || `/dashboard/data/${category.id}`}
                                                                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${location.pathname === (category.link || `/dashboard/data/${category.id}`)
                                                                        ? "text-primary font-medium bg-accent/50"
                                                                        : "text-muted-foreground hover:text-foreground"
                                                                        }`}
                                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                                >
                                                                    {category.name}
                                                                </Link>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ) : (
                                            <Link
                                                to={route.href}
                                                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${route.active
                                                    ? "bg-accent text-accent-foreground"
                                                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                                    }`}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                            >
                                                <route.icon className={`h-5 w-5 ${route.active ? "text-primary" : ""}`} />
                                                {route.label}
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        <div className="p-4 border-t border-border">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-accent/30">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                        {username ? username.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{username || "User"}</p>
                                    </div>
                                </div>
                                <button onClick={onLogout} className="text-muted-foreground hover:text-destructive">
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
        )
    }

    return (
        <>
            <DesktopSidebar />
            <MobileSidebar />
        </>
    )
}
