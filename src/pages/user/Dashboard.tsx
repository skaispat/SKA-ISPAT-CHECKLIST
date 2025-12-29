"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { LayoutDashboard, CheckCircle2, Clock, AlertTriangle, ArrowRight, ListTodo, FileBarChart, Loader2, Search, X, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import AdminLayout from "../../components/layout/AdminLayout"
import { supabase } from "../../supabase"


const UserDashboard = () => {
    const [taskView, setTaskView] = useState("upcoming")
    const [statModal, setStatModal] = useState<{ isOpen: boolean; type: string | null; title: string }>({
        isOpen: false,
        type: null,
        title: ""
    })

    // Data State
    const [tasks, setTasks] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
        completionRate: 0
    })

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)
            const username = sessionStorage.getItem("username")
            if (!username) return

            // 1. Get User Details
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("*")
                .eq("username", username)
                .single()

            if (userError) throw userError
            setUser(userData)

            // 2. Get Tasks for this user
            const { data: tasksData, error: tasksError } = await supabase
                .from("master_tasks")
                .select("*")
                .eq("name", userData.full_name)
                .order("task_start_date", { ascending: true })

            if (tasksError) throw tasksError

            // 3. Calculate Stats & Process Tasks
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const processedTasks = tasksData.map(t => {
                const isCompleted = t.status === "Yes"
                const taskDate = t.task_start_date ? new Date(t.task_start_date) : null
                let derivedStatus = 'pending'

                if (isCompleted) {
                    derivedStatus = 'completed'
                } else if (taskDate) {
                    const d = new Date(taskDate)
                    d.setHours(0, 0, 0, 0)
                    if (d < today) derivedStatus = 'overdue'
                }

                return {
                    ...t,
                    title: t.task_title,
                    displayDate: t.task_start_date ? new Date(t.task_start_date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                    }) : "N/A",
                    derivedStatus,
                    frequency: t.freq
                }
            })

            const total = processedTasks.length
            const completed = processedTasks.filter(t => t.derivedStatus === 'completed').length
            const overdue = processedTasks.filter(t => t.derivedStatus === 'overdue').length
            const pending = processedTasks.filter(t => t.derivedStatus === 'pending').length

            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

            setStats({
                total,
                completed,
                pending,
                overdue,
                completionRate
            })

            setTasks(processedTasks)

        } catch (error) {
            console.error("Error fetching dashboard data:", error)
        } finally {
            setLoading(false)
        }
    }

    const getFilteredTasks = (view: string) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Sorting helper
        const sortByDate = (a: any, b: any) => new Date(a.task_start_date).getTime() - new Date(b.task_start_date).getTime()



        if (view === "upcoming") {
            return tasks
                .filter(t => {
                    const dueDate = new Date(t.task_start_date)
                    dueDate.setHours(0, 0, 0, 0)
                    return t.status !== "Yes" && dueDate >= today
                })
                .sort(sortByDate)
                .slice(0, 5)
        }

        if (view === "overdue") {
            return tasks
                .filter(t => {
                    const dueDate = new Date(t.task_start_date)
                    dueDate.setHours(0, 0, 0, 0)
                    return t.status !== "Yes" && dueDate < today
                })
                .sort(sortByDate)
        }

        return tasks.slice(0, 5)
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A"
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        })
    }

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-[#991B1B]" />
                </div>
            </AdminLayout>
        )
    }

    return (
        <AdminLayout>
            <div className="space-y-8 p-4 md:p-0 animate-in fade-in duration-500">
                {/* Header Section */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-gray-100 pb-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                            My Dashboard
                        </h1>
                        <p className="text-sm text-gray-500">
                            Welcome back, {user?.full_name?.split(' ')[0] || 'User'}! Here's your task overview.
                        </p>
                    </div>
                    <Link
                        to="/dashboard/user/tasks"
                        className="group inline-flex items-center gap-2 rounded-lg bg-[#991B1B] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#7f1616] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#991B1B] focus:ring-offset-2"
                    >
                        View All Tasks
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Tasks"
                        value={stats.total}
                        description="Assigned to you"
                        icon={<ListTodo />}
                        accentColor="blue"
                        onClick={() => setStatModal({ isOpen: true, type: 'all', title: 'Total Tasks' })}
                    />
                    <StatCard
                        title="Completed"
                        value={stats.completed}
                        description={`${stats.completionRate}% completion rate`}
                        icon={<CheckCircle2 />}
                        accentColor="green"
                        onClick={() => setStatModal({ isOpen: true, type: 'completed', title: 'Completed Tasks' })}
                    />
                    <StatCard
                        title="Pending"
                        value={stats.pending}
                        description="Tasks to be completed"
                        icon={<Clock />}
                        accentColor="amber"
                        onClick={() => setStatModal({ isOpen: true, type: 'pending', title: 'Pending Tasks' })}
                    />
                    <StatCard
                        title="Overdue"
                        value={stats.overdue}
                        description="Requires immediate attention"
                        icon={<AlertTriangle />}
                        accentColor="red"
                        alert={true}
                        onClick={() => setStatModal({ isOpen: true, type: 'overdue', title: 'Overdue Tasks' })}
                    />
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* Left Column: Task Navigation & List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                            <div className="bg-[#FEF2F2]/30 p-1 border-b border-gray-100">
                                <div className="grid grid-cols-2 gap-1">
                                    <ViewTabButton
                                        active={taskView === "upcoming"}
                                        onClick={() => setTaskView("upcoming")}
                                        label="Upcoming"
                                    />
                                    <ViewTabButton
                                        active={taskView === "overdue"}
                                        onClick={() => setTaskView("overdue")}
                                        label="Overdue"
                                    />
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {taskView === "upcoming" && "Upcoming Tasks"}
                                            {taskView === "overdue" && "Overdue Tasks"}
                                        </h3>
                                    </h3>
                                </div>

                                <div className="space-y-3">
                                    {getFilteredTasks(taskView).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <div className="rounded-full bg-gray-50 p-3 mb-3">
                                                <ListTodo className="h-6 w-6 text-gray-400" />
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {taskView === 'overdue' ? 'No overdue tasks! Great job.' : 'No tasks found.'}
                                            </p>
                                        </div>
                                    ) : (
                                        getFilteredTasks(taskView).map((task) => (
                                            <div
                                                key={task.task_id}
                                                className="group relative flex items-start gap-4 rounded-lg border border-gray-100 bg-white p-4 transition-all hover:bg-[#FEF2F2]/30 hover:shadow-sm hover:border-[#991B1B]/20"
                                            >

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span
                                                            className={`truncate text-sm font-medium ${task.status === "Yes"
                                                                ? "text-gray-400 line-through"
                                                                : "text-gray-900 group-hover:text-[#991B1B]"
                                                                }`}
                                                        >
                                                            {task.task_title}
                                                        </span>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getFrequencyStyle(task.freq)}`}>
                                                            {task.freq}
                                                        </span>
                                                    </div>

                                                    <p className="mt-1 text-sm text-gray-500 line-clamp-1">
                                                        {task.task_description}
                                                    </p>

                                                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            Due: {formatDate(task.task_start_date)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Overview */}
                    <div className="space-y-6">
                        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                            <div className="p-6">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${stats.completionRate >= 80 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                                    {stats.completionRate >= 80 ? 'On Track' : 'Needs Focus'}
                                                </span>
                                            </div>
                                            <div className="flex items-baseline gap-2 mb-2">
                                                <span className="text-2xl font-bold text-gray-900">{stats.completionRate}%</span>
                                                <span className="text-xs text-gray-400">
                                                    ({stats.completed}/{stats.total} Done)
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#991B1B] rounded-full transition-all duration-1000"
                                                    style={{ width: `${stats.completionRate}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-100">
                                        <h4 className="text-sm font-medium text-gray-900 mb-4">Quick Stats</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <p className="text-xs text-gray-500">Pending</p>
                                                <p className="text-lg font-bold text-gray-900 mt-1">{stats.pending}</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <p className="text-xs text-gray-500">Overdue</p>
                                                <p className="text-lg font-bold text-red-600 mt-1">{stats.overdue}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Stat Tasks Modal */}
            {statModal.isOpen && (
                <StatTasksModal
                    isOpen={statModal.isOpen}
                    onClose={() => setStatModal({ ...statModal, isOpen: false })}
                    title={statModal.title}
                    tasks={tasks.filter(t => {
                        if (statModal.type === 'all') return true;
                        return t.derivedStatus === statModal.type;
                    })}
                />
            )}
        </AdminLayout>
    )
}

// Helper for frequency styles
const getFrequencyStyle = (frequency: string) => {
    switch (frequency) {
        case "daily": return "bg-blue-50 text-blue-700"
        case "weekly": return "bg-purple-50 text-purple-700"
        case "monthly": return "bg-orange-50 text-orange-700"
        default: return "bg-gray-100 text-gray-700"
    }
}

// Reusing StatCard from AdminDashboard for consistency
const StatCard = ({ title, value, description, icon, accentColor = "gray", alert = false, onClick }: any) => {
    const colorKey = alert ? "red" : accentColor;

    const colorStyles = {
        blue: {
            border: "border-blue-200 hover:border-blue-300",
            bg: "bg-blue-50/50",
            iconBg: "bg-blue-100/80 text-blue-600",
            text: "text-blue-900",
            subtext: "text-blue-600/80"
        },
        green: {
            border: "border-green-200 hover:border-green-300",
            bg: "bg-green-50/50",
            iconBg: "bg-green-100/80 text-green-600",
            text: "text-green-900",
            subtext: "text-green-600/80"
        },
        amber: {
            border: "border-amber-200 hover:border-amber-300",
            bg: "bg-amber-50/50",
            iconBg: "bg-amber-100/80 text-amber-600",
            text: "text-amber-900",
            subtext: "text-amber-600/80"
        },
        red: {
            border: "border-red-200 hover:border-red-300",
            bg: "bg-red-50/50",
            iconBg: "bg-red-100/80 text-red-600",
            text: "text-red-900",
            subtext: "text-red-600/80"
        },
        gray: {
            border: "border-gray-200 hover:border-gray-300",
            bg: "bg-white",
            iconBg: "bg-gray-100 text-gray-500",
            text: "text-gray-900",
            subtext: "text-gray-500"
        }
    }

    const style = colorStyles[colorKey as keyof typeof colorStyles] || colorStyles.gray

    return (
        <div
            onClick={onClick}
            className={`group relative overflow-hidden rounded-xl border p-6 transition-all hover:shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${style.border} ${style.bg}`}
        >
            <div className="flex items-center justify-between">
                <div className={`rounded-lg p-2 ${style.iconBg}`}>
                    {icon && <div className="h-5 w-5">{icon}</div>}
                </div>
            </div>
            <div className="mt-4">
                <h3 className={`text-sm font-medium ${style.subtext}`}>{title}</h3>
                <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-3xl font-bold tracking-tight ${style.text}`}>
                        {value}
                    </span>
                </div>
                <p className={`mt-1 text-xs ${style.subtext}`}>{description}</p>
            </div>
        </div>
    )
}

const ViewTabButton = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
    <button
        onClick={onClick}
        className={`rounded-md py-2 text-sm font-medium transition-all ${active
            ? "bg-[#991B1B] text-white shadow-sm"
            : "text-gray-600 hover:bg-white/50 hover:text-gray-900"
            }`}
    >
        {label}
    </button>
)

const StatTasksModal = ({ isOpen, onClose, title, tasks }: { isOpen: boolean; onClose: () => void; title: string; tasks: any[] }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const itemsPerPage = 10;

    // Reset filters and page when modal opens or title changes
    useEffect(() => {
        if (isOpen) {
            setCurrentPage(1);
            setSearchQuery("");
        }
    }, [isOpen, title]);

    // Filter tasks
    const filteredTasks = tasks.filter((task: any) => {
        const matchesSearch = (task.title || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage);

    // Reset page if filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 rounded-t-xl space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                            <p className="text-sm text-gray-500 mt-1">{filteredTasks.length} tasks found</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-500 hover:text-gray-900"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-lg border-gray-200 pl-9 pr-4 py-2 text-sm focus:border-[#991B1B] focus:ring-[#991B1B]"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {filteredTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                            <div className="rounded-full bg-gray-50 p-4 mb-3">
                                <ListTodo className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="font-medium">No tasks found</p>
                            <p className="text-sm">Try adjustment your search.</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block border border-gray-100 rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Task Title</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned To</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Frequency</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {currentTasks.map((task: any) => (
                                            <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize 
                                                    ${task.derivedStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                                            task.derivedStatus === 'overdue' ? 'bg-red-100 text-red-800' :
                                                                'bg-amber-100 text-amber-800'}`}>
                                                        {task.derivedStatus}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900 line-clamp-2" title={task.title}>
                                                        {task.title}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-600">{task.name || 'You'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-600 font-mono">{task.displayDate}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                                        {task.frequency}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {currentTasks.map((task: any) => (
                                    <div key={task.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm space-y-3">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="space-y-1">
                                                <div className="text-sm font-semibold text-gray-900 line-clamp-2">
                                                    {task.title}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Due: {task.displayDate}
                                                </div>
                                            </div>
                                            <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium capitalize 
                                                ${task.derivedStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                                    task.derivedStatus === 'overdue' ? 'bg-red-100 text-red-800' :
                                                        'bg-amber-100 text-amber-800'}`}>
                                                {task.derivedStatus}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Assigned To</span>
                                                <span className="text-xs font-medium text-gray-700">{task.name || 'You'}</span>
                                            </div>
                                            <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                {task.frequency}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-500">
                        Showing {filteredTasks.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filteredTasks.length)} of {filteredTasks.length} tasks
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center mr-4 gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-1 rounded-md hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="h-5 w-5 text-gray-600" />
                            </button>
                            <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">
                                {currentPage} / {totalPages || 1}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="p-1 rounded-md hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="h-5 w-5 text-gray-600" />
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default UserDashboard
