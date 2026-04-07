import { useState, useEffect, useRef } from "react"
import { supabase } from "../../supabase"
import {
    Loader2,
    Search,
    Filter,
    CheckCircle2,
    X,
    Calendar as CalendarIcon,
    Upload,
    Eye,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Share2
} from "lucide-react"

import AdminLayout from "../../components/layout/AdminLayout"

export default function DelegatedTask() {
    const todayStr = new Date().toLocaleDateString('en-CA')
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [activeMainTab, setActiveMainTab] = useState("delegated") // "delegated" or "assigned"
    const [activeTab, setActiveTab] = useState("pending") // Secondary status tab
    const [currentUser, setCurrentUser] = useState({ username: "", fullName: "" })

    // Filter states
    const [filterName, setFilterName] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [showMobileFilters, setShowMobileFilters] = useState(false)

    // Interaction states
    const [selectedTask, setSelectedTask] = useState(null)
    const [selectedRows, setSelectedRows] = useState(new Set())

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 100
    const [visibleItemsInBuffer, setVisibleItemsInBuffer] = useState(25)
    const scrollContainerRef = useRef(null)

    useEffect(() => {
        setSelectedRows(new Set())
        setCurrentPage(1)
        setVisibleItemsInBuffer(25)
    }, [activeMainTab, activeTab, searchTerm, filterName, startDate, endDate])

    useEffect(() => {
        fetchTasks()
    }, [])

    const fetchTasks = async () => {
        try {
            setLoading(true)
            const username = sessionStorage.getItem("username")
            if (!username) throw new Error("User not authenticated")

            // 1. Get User Details
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("full_name")
                .eq("username", username)
                .single()

            if (userError) throw userError
            const fullName = userData.full_name
            setCurrentUser({ username, fullName })

            // 2. Fetch One-Time Tasks
            const role = sessionStorage.getItem("role")
            let query = supabase
                .from('master_tasks')
                .select('*')
                .eq('freq', 'one-time')

            // If not admin username (specifically per user request), filter tasks
            // Note: USER specifically asked for "admin" username check here
            if (username !== 'admin') {
                query = query.or(`name.eq."${fullName}",given_by_username.eq."${username}",given_by_username.eq."${fullName}"`)
            }

            let { data: allData, error: tasksError } = await query.order('task_start_date', { ascending: false })

            if (tasksError) throw tasksError

            // Store with local status mapping
            setTasks(allData.map(t => ({ ...t, db_status: t.status })))
        } catch (error) {
            console.error("Error fetching tasks:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleLocalUpdate = (taskId, updates) => {
        setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, ...updates } : t))
    }

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = Object.values(task).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )

        const taskDateStr = task.task_start_date ? task.task_start_date.substring(0, 10) : null
        const isCompletedOrPending = task.db_status === 'Yes' || task.db_status === 'pending_approval'
        const isRejected = task.db_status === 'rejected'
        const isNotSubmitted = !isCompletedOrPending || isRejected

        let matchesTab = false

        // 1. First filter by Main Assignment Tab
        let matchesMainTab = false
        if (activeMainTab === 'delegated') {
            // "Delegated Tasks" tab: tasks where current user is the assigner (given_by_username)
            // UNLESS user is 'admin', then show all one-time tasks in Delegated tab
            if (currentUser.username === 'admin') {
                matchesMainTab = true
            } else {
                matchesMainTab = task.given_by_username === currentUser.username || task.given_by_username === currentUser.fullName
            }
        } else if (activeMainTab === 'assigned') {
            // "Assigned Work" tab: tasks where current user is the assignee (name)
            matchesMainTab = task.name === currentUser.fullName
        }

        if (!matchesMainTab) return false

        // 2. Secondary Status Tab Logic
        if (activeTab === 'completed') {
            matchesTab = isCompletedOrPending
        } else if (activeTab === 'pending') {
            // Pending tab: tasks that are NOT submitted/pending_approval AND are for today or future (or no date)
            matchesTab = isNotSubmitted && (taskDateStr >= todayStr || !taskDateStr)
        } else if (activeTab === 'overdue') {
            matchesTab = isNotSubmitted && taskDateStr && taskDateStr < todayStr
        }

        let matchesFilters = true
        if (filterName && !task.name?.toLowerCase().includes(filterName.toLowerCase()) && !task.given_by_username?.toLowerCase().includes(filterName.toLowerCase())) {
            matchesFilters = false
        }
        if (startDate && (!task.task_start_date || task.task_start_date.substring(0, 10) < startDate)) {
            matchesFilters = false
        }
        if (endDate && (!task.task_start_date || task.task_start_date.substring(0, 10) > endDate)) {
            matchesFilters = false
        }

        return matchesSearch && matchesTab && matchesFilters
    })

    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = filteredTasks.slice(indexOfFirstItem, indexOfLastItem).slice(0, visibleItemsInBuffer)
    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage)

    // Calculate Stats for Tabs
    const isCompletedStatus = (t) => t.db_status === 'Yes' || t.db_status === 'pending_approval';
    const isPendingStatus = (t) => {
        const isNotDone = !isCompletedStatus(t) || t.db_status === 'rejected';
        const dStr = t.task_start_date ? t.task_start_date.substring(0, 10) : null;
        return isNotDone && (dStr >= todayStr || !dStr);
    };
    const isOverdueStatus = (t) => {
        const isNotDone = !isCompletedStatus(t) || t.db_status === 'rejected';
        const dStr = t.task_start_date ? t.task_start_date.substring(0, 10) : null;
        return isNotDone && dStr && dStr < todayStr;
    };

    // Calculate Main Tab Totals (Using Total count of all tasks in that category)
    const delegatedTasksCount = tasks.filter(t =>
        currentUser.username === 'admin' ? true : (t.given_by_username === currentUser.username || t.given_by_username === currentUser.fullName)
    ).length
    const assignedWorkCount = tasks.filter(t => t.name === currentUser.fullName).length

    // Calculate Pending Counts for Main Tabs (To show in sidebar or highlights if needed)
    const delegatedPendingCount = tasks.filter(t =>
        (currentUser.username === 'admin' ? true : (t.given_by_username === currentUser.username || t.given_by_username === currentUser.fullName))
        && isPendingStatus(t)
    ).length
    const assignedPendingCount = tasks.filter(t => t.name === currentUser.fullName && isPendingStatus(t)).length

    // Calculate Sub-tab Counts for the currently active main category
    const currentViewTasks = tasks.filter(t => {
        if (activeMainTab === 'delegated') {
            return currentUser.username === 'admin' ? true : (t.given_by_username === currentUser.username || t.given_by_username === currentUser.fullName);
        }
        return t.name === currentUser.fullName;
    });

    const subTabStats = {
        pending: currentViewTasks.filter(isPendingStatus).length,
        overdue: currentViewTasks.filter(isOverdueStatus).length,
        completed: currentViewTasks.filter(isCompletedStatus).length
    };

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target
        if (scrollHeight - scrollTop <= clientHeight + 50) {
            if (visibleItemsInBuffer < itemsPerPage && visibleItemsInBuffer < (filteredTasks.length - indexOfFirstItem)) {
                setVisibleItemsInBuffer(prev => prev + 25)
            }
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return "-"
        const d = new Date(dateString)
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        return `${day}/${month}/${year}`
    }

    return (
        <AdminLayout>
            <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center pb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg">
                            <Share2 className="h-6 w-6 text-[#991B1B]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Delegated Tasks</h1>
                            <p className="text-sm text-gray-500 mt-1">One-time tasks assigned to or by you.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#991B1B] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 hover:bg-gray-100 focus:bg-white border-transparent focus:border-[#991B1B]/20 rounded-full text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#991B1B]/10"
                            />
                        </div>
                        <button
                            onClick={fetchTasks}
                            className="p-2 text-gray-400 hover:text-gray-900 transition-all hover:bg-gray-100 rounded-full"
                        >
                            <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <div className="flex items-center gap-1 p-1 bg-[#FEF2F2]/50 border border-red-100 rounded-xl w-fit">
                            <button
                                onClick={() => setActiveMainTab("delegated")}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeMainTab === "delegated"
                                    ? 'bg-[#991B1B] text-white shadow-md'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                                    }`}
                            >
                                <Share2 className="h-4 w-4" />
                                Delegated Tasks ({delegatedPendingCount})
                            </button>
                            <button
                                onClick={() => setActiveMainTab("assigned")}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeMainTab === "assigned"
                                    ? 'bg-[#991B1B] text-white shadow-md'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                                    }`}
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Assigned Work ({assignedPendingCount})
                            </button>
                        </div>

                        <div className="flex items-center gap-1 p-1 bg-gray-100/80 border border-gray-200 rounded-xl w-fit">
                            {['pending', 'overdue', 'completed'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === tab
                                        ? 'bg-white text-[#991B1B] shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                                        } capitalize`}
                                >
                                    {tab} ({subTabStats[tab] || 0})
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider ml-1">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#991B1B]/10 transition-all"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider ml-1">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#991B1B]/10 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="max-h-[600px] overflow-y-auto"
                    >
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Due Date</th>
                                        <th className="px-6 py-4">Assignee</th>
                                        <th className="px-6 py-4">Assigned By</th>
                                        <th className="px-6 py-4 min-w-[300px]">Task Details</th>
                                        <th className="px-6 py-4 text-center">Attachment</th>
                                        <th className="px-6 py-4">Department</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-10 text-center">
                                                <div className="flex items-center justify-center gap-2 text-gray-400">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Loading tasks...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : currentItems.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-10 text-center text-gray-400">
                                                No tasks found in this category.
                                            </td>
                                        </tr>
                                    ) : (
                                        currentItems.map((task) => (
                                            <tr key={task.task_id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${task.db_status === 'Yes' ? 'bg-green-100 text-green-700' :
                                                        task.db_status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700' :
                                                            task.db_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {task.db_status === 'Yes' ? 'Completed' :
                                                            task.db_status === 'pending_approval' ? 'Review' :
                                                                task.db_status === 'rejected' ? 'Rejected' : 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 font-medium whitespace-nowrap">
                                                    {formatDate(task.task_start_date)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-semibold text-gray-900">{task.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-medium">Assignee</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-600">@{task.given_by_username}</div>
                                                    <div className="text-[10px] text-gray-400 font-medium">Assigner</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-gray-900 mb-1">{task.task_title}</div>
                                                    <p className="text-xs text-gray-500 line-clamp-2">{task.task_description}</p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {task.uploaded_image ? (
                                                        <a href={task.uploaded_image} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#991B1B] hover:underline">
                                                            <Eye className="h-3.5 w-3.5" /> View
                                                        </a>
                                                    ) : <span className="text-gray-300">-</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                        {task.department}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden">
                            {loading ? (
                                <div className="p-6 text-center text-gray-400 flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading tasks...
                                </div>
                            ) : currentItems.length === 0 ? (
                                <div className="p-10 text-center text-gray-400">
                                    No tasks found in this category.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {currentItems.map((task) => (
                                        <div key={task.task_id} className="p-4 space-y-4 hover:bg-gray-50/30 transition-colors">
                                            {/* Header: Status and Date */}
                                            <div className="flex items-center justify-between">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${task.db_status === 'Yes' ? 'bg-green-100 text-green-700' :
                                                    task.db_status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700' :
                                                        task.db_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                            'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {task.db_status === 'Yes' ? 'Completed' :
                                                        task.db_status === 'pending_approval' ? 'Review' :
                                                            task.db_status === 'rejected' ? 'Rejected' : 'Pending'}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                                                    <CalendarIcon className="h-3.5 w-3.5 text-[#991B1B]" />
                                                    {formatDate(task.task_start_date)}
                                                </div>
                                            </div>

                                            {/* Task Info: Title and Description */}
                                            <div className="space-y-1">
                                                <div className="text-sm font-black text-gray-900 leading-tight">
                                                    {task.task_title}
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                                    {task.task_description}
                                                </p>
                                            </div>

                                            {/* Parties: Assignee and Assigner */}
                                            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50/80 rounded-xl border border-gray-100">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                                                        <Share2 className="h-3 w-3" /> Given By
                                                    </div>
                                                    <div className="text-xs font-bold text-gray-900 truncate">@{task.given_by_username}</div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                                                        <CheckCircle2 className="h-3 w-3" /> Assign To
                                                    </div>
                                                    <div className="text-xs font-bold text-gray-900 truncate">{task.name}</div>
                                                </div>
                                            </div>

                                            {/* Footer: Department and Actions */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 py-1 px-2 rounded-lg">
                                                    {task.department}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    {task.uploaded_image ? (
                                                        <a href={task.uploaded_image} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-black text-[#991B1B] bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors">
                                                            <Eye className="h-3.5 w-3.5" /> View Proof
                                                        </a>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">No Proof</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                                Showing <span className="font-bold text-gray-900">{indexOfFirstItem + 1}</span> to <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, filteredTasks.length)}</span> of <span className="font-bold text-gray-900">{filteredTasks.length}</span> results
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 border border-gray-200 rounded hover:bg-white disabled:opacity-30 transition-all"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 border border-gray-200 rounded hover:bg-white disabled:opacity-30 transition-all"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}
