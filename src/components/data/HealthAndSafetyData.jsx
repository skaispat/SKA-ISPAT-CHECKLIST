"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../supabase"
import {
    Loader2,
    Search,
    Filter,
    MoreHorizontal,
    History,
    CheckCircle2,
    X,
    Calendar as CalendarIcon,
    Upload,
    Eye,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Edit,
    AlertCircle,
    Trash2
} from "lucide-react"

import AdminLayout from "../layout/AdminLayout"

export default function HealthAndSafetyData() {
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [activeTab, setActiveTab] = useState("upcoming")

    // History Tab Filters
    const [historyFilterName, setHistoryFilterName] = useState("")
    const [historyStartDate, setHistoryStartDate] = useState("")
    const [historyEndDate, setHistoryEndDate] = useState("")

    // Upcoming Tab Filters
    const [upcomingFilterName, setUpcomingFilterName] = useState("")
    const [upcomingStartDate, setUpcomingStartDate] = useState("")
    const [upcomingEndDate, setUpcomingEndDate] = useState("")

    // Modal states
    const [selectedTask, setSelectedTask] = useState(null)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)
    const [isEditTaskOpen, setIsEditTaskOpen] = useState(false)
    const [selectedRows, setSelectedRows] = useState(new Set())

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    useEffect(() => {
        setSelectedRows(new Set())
        setCurrentPage(1)
    }, [activeTab, searchTerm, historyFilterName, historyStartDate, historyEndDate, upcomingFilterName, upcomingStartDate, upcomingEndDate])

    useEffect(() => {
        fetchTasks()
        checkAdminStatus()
    }, [])

    const [isAdmin, setIsAdmin] = useState(false)

    const checkAdminStatus = () => {
        const role = sessionStorage.getItem("role")
        setIsAdmin(role === 'admin')
    }

    const fetchTasks = async () => {
        try {
            setLoading(true)

            // 1. Fetch Department Info
            const { data: deptData, error: deptError } = await supabase
                .from('departments')
                .select('dept_name')
                .ilike('dept_name', 'HEALTH AND SAFETY')
                .single()

            if (deptError) throw deptError

            if (!deptData) {
                console.error("Health and Safety department not found")
                setLoading(false)
                return
            }

            // 2. Prepare Query
            let query = supabase
                .from('master_tasks')
                .select('*')
                .eq('department', deptData.dept_name)

            // 3. Apply Role-Based Filtering
            const role = sessionStorage.getItem("role")
            if (role !== 'admin') {
                const username = sessionStorage.getItem("username")

                if (!username) {
                    throw new Error("User not authenticated")
                }

                const { data: userData, error: userError } = await supabase
                    .from("users")
                    .select("full_name")
                    .eq("username", username)
                    .single()

                if (userError || !userData?.full_name) {
                    throw new Error("Could not retrieve user details")
                }

                query = query.eq('name', userData.full_name)
            }

            // 4. Execute Query
            const { data, error } = await query.order('timestamp', { ascending: false })

            if (error) throw error
            // Store original status as db_status for filtering
            setTasks((data || []).map(t => ({ ...t, db_status: t.status })))
        } catch (error) {
            console.error("Error fetching tasks:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleOpenHistory = (task) => {
        setSelectedTask(task)
        setIsHistoryOpen(true)
    }

    const handleLocalUpdate = (taskId, updates) => {
        setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, ...updates } : t))
    }

    const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false)

    const handleBatchSubmit = () => {
        // Validation: Check for required attachments
        const tasksToSubmit = tasks.filter(t => selectedRows.has(t.task_id));

        // Check if any selected task requires an attachment but doesn't have one
        // We ignore the inline 'status' dropdown relying on selection = intent to submit
        const missingImages = tasksToSubmit.filter(t =>
            (t.require_attachment === true || t.require_attachment === 'Yes') &&
            !t.uploaded_image
        );

        if (missingImages.length > 0) {
            alert(`Please upload images for the following tasks as attachment is required:\n${missingImages.map(t => `- ${t.task_title}`).join('\n')}`);
            return;
        }

        setIsBatchConfirmOpen(true)
    }

    const confirmBatchSubmit = async (batchRemarks) => {
        setLoading(true)
        try {
            const updates = Array.from(selectedRows).map(taskId => {
                const task = tasks.find(t => t.task_id === taskId)
                if (!task) return null

                // If batchRemarks provided, use it. Otherwise fall back to inline task.remarks
                const finalRemarks = batchRemarks ? batchRemarks : task.remarks

                const updateData = {
                    status: 'pending_approval',
                    remarks: finalRemarks,
                    uploaded_image: task.uploaded_image,
                    actual: new Date().toISOString()
                }

                return supabase.from('master_tasks').update(updateData).eq('task_id', taskId)
            }).filter(Boolean)

            await Promise.all(updates)
            await fetchTasks()
            setSelectedRows(new Set())
            setIsBatchConfirmOpen(false)
        } catch (err) {
            console.error("Error batch submitting:", err)
            alert("Failed to submit tasks")
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = async (taskId, file) => {
        if (!file) return

        // Set uploading state
        setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, isUploading: true } : t))

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${taskId}_${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(fileName)

            handleLocalUpdate(taskId, { uploaded_image: publicUrl })
        } catch (err) {
            console.error("Error uploading image:", err)
            alert("Failed to upload image")
        } finally {
            setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, isUploading: false } : t))
        }
    }

    // Get unique names for the history filter dropdown
    const uniqueHistoryNames = [...new Set(tasks
        .filter(t => (t.db_status === 'Yes' || t.db_status === 'pending_approval') && t.name)
        .map(t => t.name)
    )].sort()

    // Get unique names for the upcoming filter dropdown
    const uniqueUpcomingNames = [...new Set(tasks
        .filter(t => t.db_status !== 'Yes' && t.db_status !== 'pending_approval' && t.name) // Simplified for dropdown
        .map(t => t.name)
    )].sort()

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = Object.values(task).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )

        // Logic Update:
        // History: Status is 'Yes' OR 'pending_approval' (Since user submitted it, it shouldn't be in upcoming)
        // Upcoming: Status is NOT ('Yes' or 'pending_approval') OR Status IS 'rejected' (so they can re-do)

        const isCompletedOrPending = task.db_status === 'Yes' || task.db_status === 'pending_approval'
        const isRejected = task.db_status === 'rejected'

        const matchesTab = activeTab === 'history'
            ? isCompletedOrPending
            : (!isCompletedOrPending || isRejected)

        let matchesFilters = true
        if (activeTab === 'history') {
            // Filter by Name
            if (historyFilterName && !task.name?.toLowerCase().includes(historyFilterName.toLowerCase())) {
                matchesFilters = false
            }
            // Filter by Date Range (Start Date)
            // Using string comparison on first 10 chars (YYYY-MM-DD) covers both date-only and ISO timestamp strings correctly
            if (historyStartDate) {
                if (!task.task_start_date || task.task_start_date.substring(0, 10) < historyStartDate) {
                    matchesFilters = false
                }
            }
            if (historyEndDate) {
                if (!task.task_start_date || task.task_start_date.substring(0, 10) > historyEndDate) {
                    matchesFilters = false
                }
            }
        } else if (activeTab === 'upcoming') {
            // Filter by Name
            if (upcomingFilterName && !task.name?.toLowerCase().includes(upcomingFilterName.toLowerCase())) {
                matchesFilters = false
            }

            // Filter by Date Range
            if (upcomingStartDate) {
                if (!task.task_start_date || task.task_start_date.substring(0, 10) < upcomingStartDate) {
                    matchesFilters = false
                }
            }
            if (upcomingEndDate) {
                if (!task.task_start_date || task.task_start_date.substring(0, 10) > upcomingEndDate) {
                    matchesFilters = false
                }
            }
        }

        return matchesSearch && matchesTab && matchesFilters
    }).sort((a, b) => {
        if (activeTab === 'history') {
            // Priority 1: Pending Approval (show at top)
            // Priority 2: Sort by date descending (newest first)

            const isPendingA = a.db_status === 'pending_approval'
            const isPendingB = b.db_status === 'pending_approval'

            if (isPendingA !== isPendingB) {
                return isPendingA ? -1 : 1
            }

            // Both are same status (both pending or both completed), sort by date
            const dateA = a.actual ? new Date(a.actual) : (a.timestamp ? new Date(a.timestamp) : new Date(0))
            const dateB = b.actual ? new Date(b.actual) : (b.timestamp ? new Date(b.timestamp) : new Date(0))

            return dateB - dateA
        }

        if (activeTab === 'upcoming') {
            // Get start of today
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const dateA = a.task_start_date ? new Date(a.task_start_date) : new Date('9999-12-31')
            const dateB = b.task_start_date ? new Date(b.task_start_date) : new Date('9999-12-31')

            // Normalize task dates to be comparable with today (strip time if present/inconsistent)
            // Just comparing the raw Date objects is usually safest for ordering, 
            // but for "Past vs Future" categorization we need to be careful.
            // Let's just use the timestamps.

            const isPastA = dateA < today
            const isPastB = dateB < today

            // If one is past and the other is future/today, future comes first
            if (isPastA !== isPastB) {
                return isPastA ? 1 : -1
            }

            // Otherwise sort by date ascending
            return dateA - dateB
        }
        return 0
    })

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = filteredTasks.slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage)

    const toggleSelectAll = () => {
        const allOnPageSelected = currentItems.length > 0 && currentItems.every(t => selectedRows.has(t.task_id))

        const newSelected = new Set(selectedRows)
        if (allOnPageSelected) {
            currentItems.forEach(t => newSelected.delete(t.task_id))
        } else {
            currentItems.forEach(t => newSelected.add(t.task_id))
        }
        setSelectedRows(newSelected)
    }

    const toggleSelectRow = (taskId) => {
        const newSelected = new Set(selectedRows)
        if (newSelected.has(taskId)) {
            newSelected.delete(taskId)
        } else {
            newSelected.add(taskId)
        }
        setSelectedRows(newSelected)
    }

    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return "-"
        const d = new Date(dateString)
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        return `${day}/${month}/${year}`
    }

    // Helper to Render Cell Content (Handles boolean/null)
    const renderCell = (value) => {
        if (value === true) return "Yes";
        if (value === false) return "No";
        if (value === null || value === undefined) return "-";
        return String(value);
    }

    return (
        <AdminLayout>
            <div className="space-y-4 animate-in fade-in duration-500">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center pb-6">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Health and Safety Records</h1>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {isAdmin && (
                            <button
                                onClick={() => setIsEditTaskOpen(true)}
                                className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-full hover:bg-secondary/80 transition-all shadow-sm flex items-center gap-2"
                            >
                                <Edit className="h-4 w-4" />
                                Edit Task Info
                            </button>
                        )}
                        {selectedRows.size > 0 && (
                            <button
                                onClick={handleBatchSubmit}
                                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-all shadow-sm animate-in fade-in slide-in-from-right-2 whitespace-nowrap"
                            >
                                Submit {selectedRows.size} Tasks
                            </button>
                        )}
                        <div className="relative w-full sm:w-64 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-secondary/50 hover:bg-secondary/80 focus:bg-background border-transparent focus:border-primary/20 rounded-full text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/10"
                            />
                        </div>
                        <button
                            onClick={fetchTasks}
                            className="p-2 text-muted-foreground hover:text-foreground transition-all hover:bg-secondary/80 rounded-full"
                            title="Refresh"
                        >
                            <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg w-fit mb-6">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'upcoming'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                    >
                        Upcoming Tasks
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'history'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                    >
                        History
                    </button>
                </div>

                {/* Upcoming Filters */}
                {activeTab === 'upcoming' && (
                    <div className="flex flex-wrap items-end gap-3 mb-6 p-1 animate-in fade-in slide-in-from-top-1">
                        {isAdmin && (
                            <div className="flex flex-col gap-1 w-full sm:w-auto">
                                <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider ml-1">Filter by Name</label>
                                <select
                                    value={upcomingFilterName}
                                    onChange={(e) => setUpcomingFilterName(e.target.value)}
                                    className="h-9 px-3 w-full sm:w-48 text-sm bg-transparent border border-border/50 hover:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                                >
                                    <option value="">All Names</option>
                                    {uniqueUpcomingNames.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider ml-1">Start Date</label>
                            <input
                                type="date"
                                value={upcomingStartDate}
                                onChange={(e) => setUpcomingStartDate(e.target.value)}
                                className="h-9 px-3 text-sm bg-transparent border border-border/50 hover:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                            />
                        </div>
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider ml-1">End Date</label>
                            <input
                                type="date"
                                min={upcomingStartDate}
                                value={upcomingEndDate}
                                onChange={(e) => setUpcomingEndDate(e.target.value)}
                                className="h-9 px-3 text-sm bg-transparent border border-border/50 hover:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                            />
                        </div>
                        {(upcomingFilterName || upcomingStartDate || upcomingEndDate) && (
                            <button
                                onClick={() => {
                                    setUpcomingFilterName("")
                                    setUpcomingStartDate("")
                                    setUpcomingEndDate("")
                                }}
                                className="h-9 px-4 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                )}

                {/* History Filters */}
                {activeTab === 'history' && (
                    <div className="flex flex-wrap items-end gap-3 mb-6 p-1 animate-in fade-in slide-in-from-top-1">
                        {isAdmin && (
                            <div className="flex flex-col gap-1 w-full sm:w-auto">
                                <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider ml-1">Filter by Name</label>
                                <select
                                    value={historyFilterName}
                                    onChange={(e) => setHistoryFilterName(e.target.value)}
                                    className="h-9 px-3 w-full sm:w-48 text-sm bg-transparent border border-border/50 hover:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                                >
                                    <option value="">All Names</option>
                                    {uniqueHistoryNames.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider ml-1">Start Date</label>
                            <input
                                type="date"
                                value={historyStartDate}
                                onChange={(e) => setHistoryStartDate(e.target.value)}
                                className="h-9 px-3 text-sm bg-transparent border border-border/50 hover:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                            />
                        </div>
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider ml-1">End Date</label>
                            <input
                                type="date"
                                min={historyStartDate}
                                value={historyEndDate}
                                onChange={(e) => setHistoryEndDate(e.target.value)}
                                className="h-9 px-3 text-sm bg-transparent border border-border/50 hover:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                            />
                        </div>
                        {(historyFilterName || historyStartDate || historyEndDate) && (
                            <button
                                onClick={() => {
                                    setHistoryFilterName("")
                                    setHistoryStartDate("")
                                    setHistoryEndDate("")
                                }}
                                className="h-9 px-4 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                )}

                {/* Table Container */}
                <div className="border border-border/50 rounded-xl overflow-hidden bg-card/50 shadow-sm backdrop-blur-[2px]">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-muted/30 border-b border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                <tr>
                                    {activeTab !== 'history' && (
                                        <th className="px-4 py-3 whitespace-nowrap w-[1%]">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={currentItems.length > 0 && currentItems.every(t => selectedRows.has(t.task_id))}
                                                    onChange={toggleSelectAll}
                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                                                />
                                            </div>
                                        </th>
                                    )}
                                    <th className="px-4 py-3 whitespace-nowrap font-medium">Task ID</th>
                                    {activeTab === 'history' && <th className="px-4 py-3 whitespace-nowrap min-w-[150px] font-medium">Status</th>}
                                    <th className="px-4 py-3 whitespace-nowrap font-medium">Department</th>
                                    <th className="px-4 py-3 whitespace-nowrap font-medium">Given By</th>
                                    <th className="px-4 py-3 whitespace-nowrap font-medium">Name</th>
                                    <th className="px-4 py-3 whitespace-nowrap min-w-[450px] font-medium">Task Title</th>
                                    <th className="px-4 py-3 whitespace-nowrap min-w-[500px] font-medium">Task Description</th>
                                    <th className="px-4 py-3 whitespace-nowrap font-medium">Start Date</th>
                                    <th className="px-4 py-3 whitespace-nowrap font-medium">Freq</th>
                                    <th className="px-4 py-3 whitespace-nowrap font-medium text-center">Reminders</th>
                                    <th className="px-4 py-3 whitespace-nowrap font-medium text-center">Attachment</th>
                                    {activeTab !== 'history' && <th className="px-4 py-3 whitespace-nowrap min-w-[150px] font-medium">Status</th>}
                                    <th className="px-4 py-3 whitespace-nowrap min-w-[200px] font-medium">Remarks</th>
                                    <th className="px-4 py-3 whitespace-nowrap font-medium">Image</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {loading ? (
                                    <tr>
                                        <td colSpan="14" className="px-4 py-8 text-center text-muted-foreground">
                                            Loading data...
                                        </td>
                                    </tr>
                                ) : filteredTasks.length === 0 ? (
                                    <tr>
                                        <td colSpan="14" className="px-4 py-8 text-center text-muted-foreground">
                                            No tasks found.
                                        </td>
                                    </tr>
                                ) : (
                                    currentItems.map((task) => (
                                        <tr key={task.task_id} className="hover:bg-muted/30 transition-colors group">
                                            {activeTab !== 'history' && (
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedRows.has(task.task_id)}
                                                            onChange={() => toggleSelectRow(task.task_id)}
                                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                                                            title="Select to edit"
                                                        />
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground/80">#{String(task.task_id).length > 8 ? String(task.task_id).substring(0, 8) + '...' : task.task_id}</td>
                                            {activeTab === 'history' && (
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${task.status === 'Yes' ? 'bg-green-50 text-green-700' :
                                                        task.status === 'pending_approval' ? 'bg-yellow-50 text-yellow-700' :
                                                            'bg-red-50 text-red-700'
                                                        }`}>
                                                        {task.status === 'Yes' ? 'Completed' :
                                                            task.status === 'pending_approval' ? 'Pending Approval' :
                                                                'Incomplete'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-muted-foreground">{task.department}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{task.given_by_username}</td>
                                            <td className="px-4 py-3 text-muted-foreground font-medium">{task.name}</td>
                                            <td className="px-4 py-3 font-medium text-foreground">
                                                <div title={task.task_title} className="line-clamp-2">
                                                    {task.task_title}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                <div title={task.task_description} className="line-clamp-2">
                                                    {task.task_description}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(task.task_start_date)}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{task.freq}</td>
                                            <td className="px-4 py-3 text-muted-foreground text-center">{renderCell(task.enable_reminders)}</td>
                                            <td className="px-4 py-3 text-muted-foreground text-center">{renderCell(task.require_attachment)}</td>
                                            {activeTab !== 'history' && (
                                                <td className="px-4 py-3">
                                                    <select
                                                        disabled={!selectedRows.has(task.task_id)}
                                                        value={task.status === 'Yes' ? 'Yes' : 'No'}
                                                        onChange={(e) => handleLocalUpdate(task.task_id, { status: e.target.value })}
                                                        className={`block w-full px-2 py-1 text-xs font-medium rounded-md border-0 bg-transparent ring-1 ring-inset focus:ring-2 focus:ring-inset focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed
                                                            ${task.status === 'Yes' ? 'text-green-700 ring-green-600/20 bg-green-50' :
                                                                'text-red-700 ring-red-600/20 bg-red-50'}`}
                                                    >
                                                        <option value="Yes">Yes</option>
                                                        <option value="No">No</option>
                                                    </select>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {activeTab === 'history' ? (
                                                    <span className="text-sm line-clamp-2 max-w-[200px]" title={task.remarks}>{task.remarks || '-'}</span>
                                                ) : (
                                                    <input
                                                        disabled={!selectedRows.has(task.task_id)}
                                                        type="text"
                                                        defaultValue={task.remarks || ''}
                                                        onBlur={(e) => {
                                                            if (e.target.value !== task.remarks) {
                                                                handleLocalUpdate(task.task_id, { remarks: e.target.value })
                                                            }
                                                        }}
                                                        placeholder={selectedRows.has(task.task_id) ? "Add remarks..." : ""}
                                                        className={`w-full text-sm transition-all rounded-md 
                                                            ${selectedRows.has(task.task_id)
                                                                ? "bg-background border border-primary/50 px-3 py-2 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
                                                                : "bg-transparent border-transparent p-0 text-muted-foreground/60 cursor-not-allowed"
                                                            } focus:outline-none placeholder:text-muted-foreground/40`}
                                                    />
                                                )}
                                            </td>
                                            <td className={`px-4 py-3 text-muted-foreground ${activeTab !== 'history' ? 'min-w-[200px]' : ''}`}>
                                                <div className="flex flex-col gap-2">
                                                    {task.uploaded_image && (
                                                        <a
                                                            href={task.uploaded_image}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 hover:underline"
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                            View
                                                        </a>
                                                    )}
                                                    {activeTab === 'history' ? (
                                                        null // Hide upload in history
                                                    ) : task.isUploading ? (
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                            Uploading...
                                                        </div>
                                                    ) : (
                                                        <div className="relative group/file">
                                                            {(task.require_attachment === true || task.require_attachment === 'Yes') ? (
                                                                <>
                                                                    <button
                                                                        disabled={!selectedRows.has(task.task_id)}
                                                                        className="flex items-center gap-1.5 text-xs text-primary font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                                                                    >
                                                                        <Upload className="h-3 w-3" />
                                                                        <span>Upload</span>
                                                                    </button>
                                                                    <input
                                                                        disabled={!selectedRows.has(task.task_id)}
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={(e) => handleFileUpload(task.task_id, e.target.files?.[0])}
                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed text-[0]"
                                                                    />
                                                                </>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground/50 select-none">-</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-border/30">
                        {loading ? (
                            <div className="px-4 py-8 text-center text-muted-foreground">Loading data...</div>
                        ) : filteredTasks.length === 0 ? (
                            <div className="px-4 py-8 text-center text-muted-foreground">No tasks found.</div>
                        ) : (
                            currentItems.map((task) => (
                                <div key={task.task_id} className="p-4 space-y-3 bg-card/50">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                {activeTab !== 'history' && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.has(task.task_id)}
                                                        onChange={() => toggleSelectRow(task.task_id)}
                                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
                                                    />
                                                )}
                                                <span className="font-mono text-xs text-muted-foreground/80">#{String(task.task_id).substring(0, 8)}</span>
                                                {activeTab === 'history' && (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${task.status === 'Yes' ? 'bg-green-50 text-green-700' :
                                                            task.status === 'pending_approval' ? 'bg-yellow-50 text-yellow-700' :
                                                                'bg-red-50 text-red-700'
                                                        }`}>
                                                        {task.status === 'Yes' ? 'Completed' : task.status === 'pending_approval' ? 'Pending' : 'Incomplete'}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-medium text-sm text-foreground">{task.task_title}</h3>
                                        </div>
                                    </div>

                                    {task.task_description && (
                                        <p className="text-xs text-muted-foreground line-clamp-3">{task.task_description}</p>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <span>Freq:</span>
                                            <span className="font-medium text-foreground">{task.freq}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span>Start:</span>
                                            <span className="font-medium text-foreground">{formatDate(task.task_start_date)}</span>
                                        </div>
                                        <div>Given By: {task.given_by_username}</div>
                                    </div>

                                    {activeTab !== 'history' && (
                                        <div className="pt-2 flex items-center gap-3 border-t border-border/30">
                                            <div className="flex-1">
                                                <select
                                                    disabled={!selectedRows.has(task.task_id)}
                                                    value={task.status === 'Yes' ? 'Yes' : 'No'}
                                                    onChange={(e) => handleLocalUpdate(task.task_id, { status: e.target.value })}
                                                    className={`block w-full px-2 py-1.5 text-xs font-medium rounded-md border-0 bg-transparent ring-1 ring-inset focus:ring-2 focus:ring-inset focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed
                                                        ${task.status === 'Yes' ? 'text-green-700 ring-green-600/20 bg-green-50' :
                                                            'text-red-700 ring-red-600/20 bg-red-50'}`}
                                                >
                                                    <option value="Yes">Yes</option>
                                                    <option value="No">No</option>
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    disabled={!selectedRows.has(task.task_id)}
                                                    type="text"
                                                    defaultValue={task.remarks || ''}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== task.remarks) {
                                                            handleLocalUpdate(task.task_id, { remarks: e.target.value })
                                                        }
                                                    }}
                                                    placeholder="Remarks"
                                                    className={`w-full text-xs transition-all rounded-md 
                                                        ${selectedRows.has(task.task_id)
                                                            ? "bg-background border border-primary/50 px-2 py-1.5 text-foreground shadow-sm"
                                                            : "bg-transparent border-transparent px-0 py-1.5 text-muted-foreground/60 cursor-not-allowed"
                                                        } focus:outline-none`}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex gap-3">
                                            {task.uploaded_image && (
                                                <a
                                                    href={task.uploaded_image}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    View
                                                </a>
                                            )}
                                        </div>
                                        <div className="flex gap-3">
                                            {activeTab !== 'history' && !task.isUploading && (task.require_attachment === true || task.require_attachment === 'Yes') && (
                                                <div className="relative">
                                                    <button
                                                        disabled={!selectedRows.has(task.task_id)}
                                                        className="flex items-center gap-1.5 text-xs text-primary font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        <Upload className="h-3 w-3" />
                                                        Upload
                                                    </button>
                                                    <input
                                                        disabled={!selectedRows.has(task.task_id)}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleFileUpload(task.task_id, e.target.files?.[0])}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed text-[0]"
                                                    />
                                                </div>
                                            )}
                                            {task.isUploading && (
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                    Uploading...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Pagination Controls */}
                {filteredTasks.length > 0 && (
                    <div className="flex items-center justify-between px-2 py-4">
                        <div className="text-xs text-muted-foreground">
                            Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to <span className="font-medium">{Math.min(indexOfLastItem, filteredTasks.length)}</span> of <span className="font-medium">{filteredTasks.length}</span> results
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-md hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="First Page"
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-md hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Previous Page"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            <span className="text-xs font-medium px-2">
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-md hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Next Page"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-md hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Last Page"
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* View History Modal */}
                {isHistoryOpen && selectedTask && (
                    <HistoryModal
                        task={selectedTask}
                        onClose={() => setIsHistoryOpen(false)}
                    />
                )}

                {/* Batch Confirm Modal */}
                {isBatchConfirmOpen && (
                    <BatchConfirmModal
                        count={selectedRows.size}
                        onClose={() => setIsBatchConfirmOpen(false)}
                        onConfirm={confirmBatchSubmit}
                        loading={loading}
                    />
                )}

                {/* Edit Info Modal */}
                {isEditTaskOpen && (
                    <EditTaskInfoModal
                        tasks={tasks}
                        onClose={() => setIsEditTaskOpen(false)}
                        onUpdate={(count) => {
                            fetchTasks()
                            setIsEditTaskOpen(false)
                        }}
                        onRefresh={fetchTasks}
                    />
                )}
            </div>
        </AdminLayout >
    )
}

// History Modal Component
function HistoryModal({ task, onClose }) {
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterMember, setFilterMember] = useState("")
    const [filterDate, setFilterDate] = useState("")

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true)
            try {
                // Fetch tasks with the same title to simulate history
                let query = supabase
                    .from('master_tasks')
                    .select('*')
                    .eq('task_title', task.task_title)
                    .eq('department', task.department)
                    .neq('task_id', task.task_id) // Exclude current? Or keep it? Let's keep all.
                    .order('timestamp', { ascending: false })

                // Helper to apply filters if we were doing server-side, 
                // but user asked for UI filters in the dropdown/view. 
                // We'll fetch all matching title then filter client side or server side.
                // Let's do client side for simplicity if dataset is small, or server side.

                const { data, error } = await query
                if (error) throw error
                setHistory(data || [])
            } catch (err) {
                console.error("Error fetching history:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchHistory()
    }, [task])

    const filteredHistory = history.filter(item => {
        const matchMember = filterMember ? item.given_by_username?.toLowerCase().includes(filterMember.toLowerCase()) ||
            item.name?.toLowerCase().includes(filterMember.toLowerCase()) : true
        // Date filter: check if timestamp or actual date matches
        const itemDate = item.timestamp ? new Date(item.timestamp).toISOString().split('T')[0] : ''
        const matchDate = filterDate ? itemDate === filterDate : true

        return matchMember && matchDate
    })

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                        <h2 className="text-lg font-semibold">Task History</h2>
                        <p className="text-sm text-muted-foreground">For: {task.task_title}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-accent rounded-full text-muted-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4 border-b border-border flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Filter by Member</label>
                        <input
                            type="text"
                            placeholder="Name or Username..."
                            value={filterMember}
                            onChange={(e) => setFilterMember(e.target.value)}
                            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                        />
                    </div>
                    <div className="w-full sm:w-auto">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Filter by Date</label>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-y-auto p-0 flex-1">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-muted/30 border-b border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold sticky top-0 backdrop-blur-sm">
                            <tr>
                                <th className="px-4 py-3 font-medium">Date</th>
                                <th className="px-4 py-3 font-medium">User</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Remarks</th>
                                <th className="px-4 py-3 font-medium">Actual Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">Loading history...</td></tr>
                            ) : filteredHistory.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">No history records found.</td></tr>
                            ) : (
                                filteredHistory.map(item => (
                                    <tr key={item.task_id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="font-medium">
                                                {(() => {
                                                    const d = new Date(item.timestamp)
                                                    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
                                                })()}
                                            </span>
                                            <span className="block text-[10px] text-muted-foreground mt-0.5">
                                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-foreground">{item.given_by_username}</span>
                                            {item.name && <span className="text-muted-foreground text-xs ml-1">({item.name})</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'Yes' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                {item.status === 'Yes' ? 'Completed' : item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 max-w-xs text-muted-foreground text-xs leading-relaxed">{item.remarks || '-'}</td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{item.actual ? (() => {
                                            const d = new Date(item.actual)
                                            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
                                        })() : '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

// Submit Task Modal Component
function SubmitTaskModal({ task, onClose }) {
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [file, setFile] = useState(null)
    const [formData, setFormData] = useState({
        status: task.status === 'Yes' ? 'Yes' : (task.status || 'Yes'),
        actual: task.actual ? new Date(task.actual).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        remarks: task.remarks || '',
        delay: task.delay || 0,
        uploaded_image: task.uploaded_image || ''
    })

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0])
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            let imageUrl = formData.uploaded_image

            if (file) {
                setUploading(true)
                const fileExt = file.name.split('.').pop()
                const fileName = `${task.task_id}_${Date.now()}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('images')
                    .upload(fileName, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('images')
                    .getPublicUrl(fileName)

                imageUrl = publicUrl
                setUploading(false)
            }

            const { error } = await supabase
                .from('master_tasks')
                .update({
                    status: formData.status,
                    actual: formData.actual,
                    remarks: formData.remarks,
                    delay: formData.delay,
                    uploaded_image: imageUrl
                })
                .eq('task_id', task.task_id)

            if (error) throw error
            onClose()
        } catch (err) {
            console.error("Error updating task:", err)
            alert("Failed to update task: " + err.message)
            setUploading(false)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold">Update Task</h2>
                    <button onClick={onClose} className="p-2 hover:bg-accent rounded-full text-muted-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Status</label>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-border bg-background"
                        >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="Yes">Yes (Completed)</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Actual Date</label>
                        <input
                            type="date"
                            value={formData.actual}
                            onChange={e => setFormData({ ...formData, actual: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-border bg-background"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Delay (Days)</label>
                        <input
                            type="number"
                            value={formData.delay}
                            onChange={e => setFormData({ ...formData, delay: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 rounded-md border border-border bg-background"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Remarks</label>
                        <textarea
                            value={formData.remarks}
                            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-border bg-background min-h-[80px]"
                            placeholder="Enter any remarks..."
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Upload Image</label>
                        <div className="flex flex-col gap-2">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="w-full text-sm text-muted-foreground
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-primary/10 file:text-primary
                                hover:file:bg-primary/20"
                            />
                            {formData.uploaded_image && !file && (
                                <p className="text-xs text-muted-foreground truncate">
                                    Current: {formData.uploaded_image}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || uploading}
                            className="px-4 py-2 text-sm font-medium text-white bg-[#991B1B] hover:bg-[#7f1616] rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {uploading ? 'Uploading...' : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function BatchConfirmModal({ count, onClose, onConfirm, loading }) {
    const [remarks, setRemarks] = useState("")

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-border/50">
                <div className="p-6 text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Confirm Submission</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Are you sure you want to submit {count} selected {count === 1 ? 'task' : 'tasks'} for approval?
                        </p>
                    </div>
                    <div className="text-left w-full">
                        <label className="text-xs font-medium text-muted-foreground block mb-1">Remarks (Optional)</label>
                        <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Add a remark for these tasks..."
                            className="w-full text-sm rounded-lg border border-border bg-muted/20 p-2 focus:ring-1 focus:ring-primary focus:border-primary outline-none min-h-[80px]"
                        />
                    </div>
                </div>

                <div className="flex gap-3 p-4 bg-muted/30 border-t border-border/50">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-border disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(remarks)}
                        disabled={loading}
                        className="flex-1 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Submit'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

function EditTaskInfoModal({ tasks, onClose, onUpdate, onRefresh }) {
    const [selectedEmployee, setSelectedEmployee] = useState("")
    const [selectedTitle, setSelectedTitle] = useState("")

    // Form Fields
    const [newTitle, setNewTitle] = useState("")
    const [newDescription, setNewDescription] = useState("")
    const [newDepartment, setNewDepartment] = useState("")
    const [newGivenBy, setNewGivenBy] = useState("")
    const [newName, setNewName] = useState("")
    const [originalName, setOriginalName] = useState("")
    const [newEnableReminders, setNewEnableReminders] = useState(false)
    const [newRequireAttachment, setNewRequireAttachment] = useState(false)

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

    // Options for dropdowns
    const [deptOptions, setDeptOptions] = useState([])
    const [userOptions, setUserOptions] = useState([])

    useEffect(() => {
        const fetchData = async () => {
            const { data: depts } = await supabase.from('departments').select('dept_name').eq('is_active', true).order('dept_name')
            if (depts) setDeptOptions(depts.map(d => d.dept_name))

            const { data: users } = await supabase.from('users').select('full_name, username').eq('status', 'active').order('full_name')
            if (users) setUserOptions(users)
        }
        fetchData()
    }, [])

    // Calculate unique employees and titles
    const uniqueEmployees = [...new Set(tasks.map(t => t.name))].filter(Boolean).sort()
    const filteredTasksByEmployee = selectedEmployee
        ? tasks.filter(t => t.name === selectedEmployee)
        : tasks
    const uniqueTitles = [...new Set(filteredTasksByEmployee.map(t => t.task_title))].sort()

    // Populate form when title is selected
    useEffect(() => {
        if (selectedTitle) {
            const task = tasks.find(t => t.task_title === selectedTitle)
            if (task) {
                setNewTitle(task.task_title)
                setNewDescription(task.task_description || "")
                setNewDepartment(task.department || "")
                setNewGivenBy(task.given_by_username || "")
                setNewName(task.name || "")
                setOriginalName(task.name || "")
                setNewEnableReminders(task.enable_reminders || false)
                setNewRequireAttachment(task.require_attachment === true || task.require_attachment === 'Yes')
            }
        } else {
            setNewTitle("")
            setNewDescription("")
            setNewDepartment("")
            setNewGivenBy("")
            setNewName("")
            setOriginalName("")
            setNewEnableReminders(false)
            setNewRequireAttachment(false)
        }
    }, [selectedTitle, tasks])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!selectedTitle || !newTitle) return

        setIsSubmitting(true)
        try {
            const department = tasks[0]?.department || 'Health and Safety'

            const { data, error } = await supabase
                .from('master_tasks')
                .update({
                    task_title: newTitle,
                    task_description: newDescription,
                    department: newDepartment,
                    given_by_username: newGivenBy,
                    name: newName,
                    enable_reminders: newEnableReminders,
                    require_attachment: newRequireAttachment
                })
                .eq('task_title', selectedTitle)
                .eq('department', department)
                .select()

            if (error) throw error

            alert(`Successfully updated tasks.`)
            onUpdate(data.length)
        } catch (err) {
            console.error("Error updating tasks:", err)
            alert("Failed to update tasks")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Filter tasks that will be deleted based on current selection
    const tasksToDelete = selectedTitle
        ? tasks.filter(t => t.task_title === selectedTitle && t.department === (tasks[0]?.department || 'Health and Safety'))
        : []

    const handleDeleteClick = () => {
        setIsDeleteConfirmOpen(true)
    }

    const confirmDelete = async () => {
        setIsSubmitting(true)
        try {
            const department = tasks[0]?.department || 'Health and Safety'

            const { error } = await supabase
                .from('master_tasks')
                .delete()
                .eq('task_title', selectedTitle)
                .eq('department', department)

            if (error) throw error

            alert(`Successfully deleted ${tasksToDelete.length} tasks.`)
            onUpdate(tasksToDelete.length)
        } catch (err) {
            console.error("Error deleting tasks:", err)
            alert("Failed to delete tasks")
        } finally {
            setIsSubmitting(false)
            setIsDeleteConfirmOpen(false)
        }
    }

    const handleDeleteSingle = async (taskId) => {
        if (!window.confirm("Are you sure you want to delete this specific task instance?")) return

        try {
            const { error } = await supabase
                .from('master_tasks')
                .delete()
                .eq('task_id', taskId)

            if (error) throw error

            // Refresh parent data which will trigger this component to re-render with updated 'tasks' prop
            if (onRefresh) onRefresh()
        } catch (err) {
            console.error("Error deleting task:", err)
            alert("Failed to delete task")
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
            <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-border/50">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/10">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">Edit Task Details</h2>
                        <p className="text-sm text-muted-foreground">Modify task definitions across the department.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <form id="edit-task-form" onSubmit={handleSubmit} className="space-y-8">

                        {/* Section 1: Filter & Selection */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-3">1. Select Task</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Filter by Employee <span className="text-muted-foreground font-normal">(Optional)</span></label>
                                    <div className="relative">
                                        <select
                                            value={selectedEmployee}
                                            onChange={(e) => {
                                                setSelectedEmployee(e.target.value)
                                                setSelectedTitle("")
                                            }}
                                            className="w-full pl-3 pr-10 py-2.5 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all appearance-none"
                                        >
                                            <option value="">Show All Employees</option>
                                            {uniqueEmployees.map(emp => (
                                                <option key={emp} value={emp}>{emp}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                            <Filter className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Select Task Title<span className="text-destructive">*</span></label>
                                    <select
                                        value={selectedTitle}
                                        onChange={(e) => setSelectedTitle(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                                        required
                                    >
                                        <option value="">-- Choose Task to Edit --</option>
                                        {uniqueTitles.map(title => (
                                            <option key={title} value={title}>{title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {selectedTitle && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <hr className="border-border/50" />

                                {/* Section 2: Core Details */}
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-4">2. Task Configuration</h3>

                                    {/* Reassignment Alert */}
                                    {originalName && newName && originalName !== newName && (
                                        <div className="mb-6 p-4 rounded-lg bg-indigo-50/50 border border-indigo-100 text-indigo-900 flex gap-3 items-start animate-in fade-in">
                                            <AlertCircle className="h-5 w-5 shrink-0 text-indigo-500 mt-0.5" />
                                            <div>
                                                <h4 className="font-semibold text-sm">Reassignment Notice</h4>
                                                <p className="text-sm mt-1 text-indigo-800/80">
                                                    This task is currently assigned to <span className="font-medium bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-950">{originalName}</span>.
                                                    You are reassigning it to <span className="font-medium bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-950">{newName}</span>.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Department</label>
                                            <select
                                                value={newDepartment}
                                                onChange={(e) => setNewDepartment(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 hover:bg-background text-sm transition-colors"
                                            >
                                                <option value="">Select Department</option>
                                                {deptOptions.map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Assigned By</label>
                                            <select
                                                value={newGivenBy}
                                                onChange={(e) => setNewGivenBy(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 hover:bg-background text-sm transition-colors"
                                            >
                                                <option value="">Select Delegator</option>
                                                {userOptions.map(u => (
                                                    <option key={u.username} value={u.username}>{u.full_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Assigned To (Doer)</label>
                                            <select
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                className={`w-full px-3 py-2 rounded-lg border text-sm transition-all shadow-sm ${originalName !== newName && newName ? "border-indigo-300 bg-indigo-50/20 ring-2 ring-indigo-500/10" : "border-input bg-background/50"}`}
                                            >
                                                <option value="">Select Assignee</option>
                                                {userOptions.map(u => (
                                                    <option key={u.username} value={u.full_name}>{u.full_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-5">
                                        <label className="text-sm font-medium">Task Title</label>
                                        <input
                                            type="text"
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2 mb-6">
                                        <label className="text-sm font-medium">Description</label>
                                        <textarea
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            rows={4}
                                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                                        />
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg bg-muted/40 border border-muted">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={newEnableReminders}
                                                    onChange={(e) => setNewEnableReminders(e.target.checked)}
                                                    className="peer h-4 w-4 opacity-0 absolute"
                                                />
                                                <div className="h-5 w-9 rounded-full bg-input border border-gray-300 peer-checked:bg-primary peer-checked:border-primary transition-all relative">
                                                    <div className="absolute top-[2px] left-[2px] h-4 w-4 rounded-full bg-white shadow-sm peer-checked:translate-x-4 transition-transform"></div>
                                                </div>
                                            </div>
                                            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Enable Reminders</span>
                                        </label>

                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={newRequireAttachment}
                                                    onChange={(e) => setNewRequireAttachment(e.target.checked)}
                                                    className="peer h-4 w-4 opacity-0 absolute"
                                                />
                                                <div className="h-5 w-9 rounded-full bg-input border border-gray-300 peer-checked:bg-primary peer-checked:border-primary transition-all relative">
                                                    <div className="absolute top-[2px] left-[2px] h-4 w-4 rounded-full bg-white shadow-sm peer-checked:translate-x-4 transition-transform"></div>
                                                </div>
                                            </div>
                                            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Require Evidence (Photo)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-border bg-muted/10 flex justify-between items-center gap-3 z-10">
                    <div>
                        {selectedTitle && (
                            <button
                                type="button"
                                onClick={handleDeleteClick}
                                disabled={isSubmitting}
                                className="px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-red-200 flex items-center gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete Task
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-input"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="edit-task-form"
                            disabled={isSubmitting || !selectedTitle}
                            className="px-5 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {isDeleteConfirmOpen && (
                    <DeleteTaskConfirmModal
                        tasksToDelete={tasksToDelete}
                        onClose={() => setIsDeleteConfirmOpen(false)}
                        onConfirm={confirmDelete}
                        onDeleteSingle={handleDeleteSingle}
                        loading={isSubmitting}
                    />
                )}
            </div>
        </div>
    )
}

function DeleteTaskConfirmModal({ tasksToDelete, onClose, onConfirm, onDeleteSingle, loading }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden border border-border/50">
                <div className="p-6 text-center space-y-4 flex-shrink-0">
                    <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
                        <Trash2 className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Delete Tasks</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Are you sure you want to delete these <span className="font-bold text-foreground">{tasksToDelete.length}</span> tasks?
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-2 min-h-0 border-t border-b border-border/50 bg-muted/10">
                    <ul className="space-y-2">
                        {tasksToDelete.map(task => (
                            <li key={task.task_id} className="text-xs text-left p-3 rounded-lg bg-background border border-border/60 shadow-sm flex flex-col gap-2 group">
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <span className="font-medium text-foreground line-clamp-1">{task.task_title}</span>
                                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{task.task_description || "No description"}</p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDeleteSingle(task.task_id)
                                        }}
                                        className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Delete this specific task"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                                    <span>{new Date(task.task_start_date).toLocaleDateString()}</span>
                                    <span>ID: {task.task_id}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex gap-3 p-4 bg-muted/30 border-t border-border/50 flex-shrink-0">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-border disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Yes, Delete'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
