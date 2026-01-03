"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../supabase"
import AdminLayout from "../../components/layout/AdminLayout"
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Calendar as CalendarIcon,
  FileText,
  Upload,
  Eye,
  Loader2,
  X
} from "lucide-react"

export default function UserTasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  // Filters
  const [filterStatus, setFilterStatus] = useState("pending")
  const [filterFrequency, setFilterFrequency] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Task Completion State
  const [selectedTask, setSelectedTask] = useState(null) // For completion modal
  const [remarks, setRemarks] = useState("")
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Status fortoast
  const [toast, setToast] = useState({ show: false, message: "", type: "" })

  useEffect(() => {
    fetchUserAndTasks()
  }, [])

  const fetchUserAndTasks = async () => {
    try {
      setLoading(true)
      const username = sessionStorage.getItem("username")
      if (!username) {
        // Handle not logged in - usually handled by layout/router
        setLoading(false)
        return
      }

      // 1. Get User Details
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single()

      if (userError) throw userError
      setUser(userData)

      // 2. Get Tasks for this user
      // Note: 'name' column in master_tasks stores the full name of the doer
      let allTasks = []
      let fetchPage = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: tasksData, error: tasksError } = await supabase
          .from("master_tasks")
          .select("*")
          .eq("name", userData.full_name) // Filtering by full name
          .order("task_start_date", { ascending: true })
          .range(fetchPage * pageSize, (fetchPage + 1) * pageSize - 1)

        if (tasksError) throw tasksError

        if (tasksData && tasksData.length > 0) {
          allTasks = [...allTasks, ...tasksData]

          if (tasksData.length < pageSize) {
            hasMore = false
          } else {
            fetchPage++
          }
        } else {
          hasMore = false
        }
      }

      setTasks(allTasks)

    } catch (error) {
      console.error("Error fetching data:", error)
      showToast("Failed to load tasks", "error")
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000)
  }

  // Filter Logic
  const filteredTasks = tasks.filter(task => {
    // Status Filter
    const isCompleted = task.status === "Yes"
    if (filterStatus === "pending" && isCompleted) return false
    if (filterStatus === "completed" && !isCompleted) return false

    // Frequency Filter
    if (filterFrequency !== "all" && task.freq !== filterFrequency) return false

    // Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        task.task_title?.toLowerCase().includes(q) ||
        task.task_description?.toLowerCase().includes(q)
      )
    }

    return true
  })

  // Pagination Logic
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentTasks = filteredTasks.slice(indexOfFirstItem, indexOfLastItem)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, filterFrequency, searchQuery])

  // Group tasks by date for better UI (optional, but nice) - sticking to flat list for now with date headers maybe?
  // Let's just do a clean card list.

  const handleCompleteClick = (task) => {
    setSelectedTask(task)
    setRemarks("")
    setFile(null)
  }

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
  }

  const handleSubmitCompletion = async (e) => {
    e.preventDefault()
    if (!selectedTask) return

    // Validation
    if ((selectedTask.require_attachment === true || selectedTask.require_attachment === "Yes") && !file) {
      showToast("Proof attachment is required for this task", "error")
      return
    }

    try {
      setSubmitting(true)
      let publicUrl = null

      // Upload Image if exists
      if (file) {
        setUploading(true)
        const fileExt = file.name.split('.').pop()
        const fileName = `${selectedTask.task_id}_${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl: url } } = supabase.storage
          .from('images')
          .getPublicUrl(fileName)

        publicUrl = url
        setUploading(false)
      }

      // Update Task
      const updateData = {
        status: "pending_approval",
        remarks: remarks,
        uploaded_image: publicUrl,
        actual: new Date().toISOString() // Current timestamp as completion time
      }

      const { error: updateError } = await supabase
        .from("master_tasks")
        .update(updateData)
        .eq("task_id", selectedTask.task_id)

      if (updateError) throw updateError

      // Update local state
      setTasks(prev => prev.map(t =>
        t.task_id === selectedTask.task_id
          ? { ...t, ...updateData }
          : t
      ))

      showToast("Task completed successfully!", "success")
      setSelectedTask(null)
    } catch (error) {
      console.error("Error completing task:", error)
      showToast("Failed to complete task", "error")
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  }

  const getStatusBadge = (task) => {
    if (task.status === "Yes") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <CheckCircle2 className="w-3 h-3" /> Completed
        </span>
      )
    }

    if (task.status === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          <AlertCircle className="w-3 h-3" /> Rejected - Re-Do
        </span>
      )
    }

    if (task.status === "pending_approval") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
          <Clock className="w-3 h-3" /> Waiting Approval
        </span>
      )
    }

    const dueDate = new Date(task.task_start_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (dueDate < today) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          <AlertCircle className="w-3 h-3" /> Overdue
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
        <Clock className="w-3 h-3" /> Pending
      </span>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Tasks</h1>
            <p className="text-gray-500 mt-1">
              Welcome back, <span className="font-semibold text-[#991B1B]">{user?.full_name || "User"}</span>.
              You have <span className="font-bold">{tasks.filter(t => t.status !== 'Yes').length}</span> pending tasks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUserAndTasks}
              className="p-2 text-gray-500 hover:text-gray-900 transition-colors bg-white border border-gray-200 rounded-full hover:shadow-sm"
              title="Refresh Tasks"
            >
              <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">

          {/* Search */}
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B] sm:text-sm transition-all"
            />
          </div>

          {/* Filter Group */}
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
              <button
                onClick={() => setFilterStatus("pending")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterStatus === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilterStatus("completed")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterStatus === 'completed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Completed
              </button>
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterStatus === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                All
              </button>
            </div>

            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value)}
              className="block w-full md:w-40 pl-3 pr-10 py-2 text-base border-gray-200 focus:outline-none focus:ring-[#991B1B] focus:border-[#991B1B] sm:text-sm rounded-lg bg-white"
            >
              <option value="all">Frequency: All</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="one-time">One Time</option>
            </select>
          </div>
        </div>

        {/* Task Groups */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 text-[#991B1B] animate-spin mb-4" />
            <p className="text-gray-500">Loading your tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <div className="mx-auto h-12 w-12 text-gray-400 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No tasks found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filterStatus === 'completed' ? "You haven't completed any tasks yet." : "You're all caught up! No pending tasks."}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Helper to calculate groups */}
            {(() => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)

              const tomorrow = new Date(today)
              tomorrow.setDate(tomorrow.getDate() + 1)

              const groups = { today: [], tomorrow: [], rest: [] }

              const parseLocalDoDate = (dateStr) => {
                if (!dateStr) return null;
                if (dateStr.includes('T')) {
                  const d = new Date(dateStr)
                  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
                }
                const parts = dateStr.split('-')
                if (parts.length === 3) {
                  const [y, m, d] = parts.map(Number)
                  return new Date(y, m - 1, d)
                }
                return new Date(dateStr)
              }

              currentTasks.forEach(task => {
                const taskDate = parseLocalDoDate(task.task_start_date)

                if (!taskDate) {
                  groups.rest.push(task)
                  return
                }
                // Ensure time is stripped for comparison
                taskDate.setHours(0, 0, 0, 0)

                if (taskDate < today || taskDate.getTime() === today.getTime()) {
                  groups.today.push(task)
                } else if (taskDate.getTime() === tomorrow.getTime()) {
                  groups.tomorrow.push(task)
                } else {
                  groups.rest.push(task)
                }
              })

              const renderTable = (tasks, title, icon, isToday = false) => (
                <div className={`rounded-xl overflow-hidden border ${isToday ? 'border-red-200 shadow-lg shadow-red-50' : 'border-gray-200 shadow-sm'} mb-8`}>
                  {/* Section Header */}
                  <div className={`p-4 flex items-center justify-between border-b ${isToday ? 'bg-red-50/50 border-red-100' : 'bg-gray-50/50 border-gray-200'}`}>
                    <h2 className={`text-lg font-bold flex items-center gap-2 ${isToday ? 'text-[#991B1B]' : 'text-gray-700'}`}>
                      <span className={`p-1.5 rounded-lg ${isToday ? 'bg-red-100' : 'bg-white border border-gray-200'}`}>{icon}</span>
                      {title}
                    </h2>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${isToday ? 'bg-red-100 text-[#991B1B]' : 'bg-gray-200 text-gray-600'}`}>
                      {tasks.length}
                    </span>
                  </div>

                  {/* Table */}
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className={`text-xs uppercase bg-gray-50/30 text-gray-500 font-medium border-b border-gray-100 ${isToday ? 'bg-red-50/10' : ''}`}>
                        <tr>
                          <th className="px-6 py-3 w-[150px]">Status</th>
                          <th className="px-6 py-3">Task Details</th>
                          <th className="px-6 py-3 w-[150px]">Due Date</th>
                          <th className="px-6 py-3 w-[150px]">Dept</th>
                          <th className="px-6 py-3 w-[150px]">Assigned By</th>
                          <th className="px-6 py-3 w-[120px] text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {tasks.map(task => (
                          <tr
                            key={task.task_id}
                            className={`hover:bg-gray-50/80 transition-colors ${task.status === 'Yes' ? 'opacity-60 bg-gray-50/50' : ''} ${isToday ? 'hover:bg-red-50/10' : ''}`}
                          >
                            <td className="px-6 py-4 align-top">
                              <div className="flex flex-col gap-1 items-start">
                                {getStatusBadge(task)}
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 border border-gray-100 rounded bg-gray-50">
                                  {task.freq}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <div className="space-y-1">
                                <p className={`font-semibold text-gray-900 ${task.status === 'Yes' ? 'line-through text-gray-500' : ''}`}>
                                  {task.task_title}
                                </p>
                                <p className="text-gray-500 text-xs line-clamp-2">{task.task_description}</p>

                                {/* Rejected Info Inline */}
                                {task.status === 'rejected' && task.remarks && (
                                  <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600 border border-red-100">
                                    <span className="font-semibold">Rejection Note:</span> {task.remarks}
                                  </div>
                                )}

                                {/* Completed Info Inline */}
                                {task.status === 'Yes' && (
                                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                                    {task.remarks && <span className="text-gray-600"><span className="font-medium text-gray-900">Note:</span> {task.remarks}</span>}
                                    {task.uploaded_image && (
                                      <a href={task.uploaded_image} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#991B1B] hover:underline font-medium">
                                        <Eye className="w-3 h-3" /> View Proof
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 align-top whitespace-nowrap text-gray-600 font-medium">
                              {formatDate(task.task_start_date)}
                            </td>
                            <td className="px-6 py-4 align-top whitespace-nowrap text-gray-600">
                              {task.department}
                            </td>
                            <td className="px-6 py-4 align-top whitespace-nowrap text-gray-600">
                              {task.given_by_username}
                            </td>
                            <td className="px-6 py-4 align-top text-right">
                              {task.status !== 'Yes' && task.status !== 'pending_approval' && (
                                <button
                                  onClick={() => handleCompleteClick(task)}
                                  className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-medium text-white bg-[#991B1B] hover:bg-[#7f1d1d] rounded-full transition-colors shadow-sm shadow-red-100 whitespace-nowrap"
                                >
                                  {task.status === 'rejected' ? 'Re-Submit' : 'Complete'}
                                </button>
                              )}
                              {task.status === 'pending_approval' && (
                                <span className="text-xs text-gray-400 italic">In Review</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4 p-4">
                    {tasks.map(task => (
                      <div key={task.task_id} className={`bg-white border rounded-xl p-4 shadow-sm ${task.status === 'Yes' ? 'border-gray-100 opacity-75' : isToday ? 'border-red-100' : 'border-gray-100'}`}>
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <div className="space-y-1">
                            {getStatusBadge(task)}
                          </div>
                          <span className="text-xs text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded">
                            {task.freq}
                          </span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <h3 className={`font-semibold text-gray-900 ${task.status === 'Yes' ? 'line-through text-gray-500' : ''}`}>
                            {task.task_title}
                          </h3>
                          <p className="text-sm text-gray-500 line-clamp-2">{task.task_description}</p>

                          {task.status === 'rejected' && task.remarks && (
                            <div className="p-2 bg-red-50 rounded text-xs text-red-600 border border-red-100">
                              <span className="font-semibold">Rejection Note:</span> {task.remarks}
                            </div>
                          )}

                          {task.status === 'Yes' && (
                            <div className="space-y-2 text-xs">
                              {task.remarks && <p className="text-gray-600"><span className="font-medium text-gray-900">Note:</span> {task.remarks}</p>}
                              {task.uploaded_image && (
                                <a href={task.uploaded_image} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#991B1B] hover:underline font-medium">
                                  <Eye className="w-3 h-3" /> View Proof
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-gray-500 pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            <span>{formatDate(task.task_start_date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">From:</span> {task.given_by_username}
                          </div>
                        </div>

                        {task.status !== 'Yes' && task.status !== 'pending_approval' && (
                          <button
                            onClick={() => handleCompleteClick(task)}
                            className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[#991B1B] hover:bg-[#7f1d1d] rounded-lg transition-colors shadow-sm shadow-red-100"
                          >
                            {task.status === 'rejected' ? 'Re-Submit' : 'Complete Task'}
                          </button>
                        )}
                        {task.status === 'pending_approval' && (
                          <div className="mt-3 text-center text-xs text-yellow-600 font-medium bg-yellow-50 py-2 rounded-lg border border-yellow-100">
                            Waiting for Approval
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )

              return (
                <>
                  {groups.today.length > 0 && renderTable(groups.today, "Today & Overdue", <Clock className="w-4 h-4" />, true)}
                  {groups.tomorrow.length > 0 && renderTable(groups.tomorrow, "Tomorrow", <CalendarIcon className="w-4 h-4" />, false)}
                  {groups.rest.length > 0 && renderTable(groups.rest, "Upcoming & Others", <FileText className="w-4 h-4" />, false)}
                </>
              )
            })()}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-4 flex-wrap">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-200 rounded-md disabled:opacity-50 hover:bg-gray-50 flex items-center gap-1"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1 flex-wrap justify-center">
                  {(() => {
                    const pages = [];
                    // Logic to show limited pages
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      if (currentPage <= 4) {
                        for (let i = 1; i <= 5; i++) pages.push(i);
                        pages.push('...');
                        pages.push(totalPages);
                      } else if (currentPage >= totalPages - 3) {
                        pages.push(1);
                        pages.push('...');
                        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        pages.push('...');
                        pages.push(currentPage - 1);
                        pages.push(currentPage);
                        pages.push(currentPage + 1);
                        pages.push('...');
                        pages.push(totalPages);
                      }
                    }

                    return pages.map((page, index) => (
                      <button
                        key={index}
                        onClick={() => typeof page === 'number' && setCurrentPage(page)}
                        disabled={typeof page !== 'number'}
                        className={`min-w-[2rem] h-8 px-2 flex items-center justify-center rounded-md text-sm border 
                            ${page === currentPage
                            ? 'bg-[#991B1B] text-white border-[#991B1B]'
                            : typeof page === 'number'
                              ? 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                              : 'bg-transparent text-gray-400 border-transparent cursor-default'
                          }`}
                      >
                        {page}
                      </button>
                    ));
                  })()}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-200 rounded-md disabled:opacity-50 hover:bg-gray-50 flex items-center gap-1"
                >
                  Next
                </button>
              </div>
            )}
          </div>

        )}

        {/* Completion Modal */}
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-lg text-gray-900">Complete Task</h3>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitCompletion} className="p-6">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{selectedTask.task_title}</h4>
                  <p className="text-xs text-gray-500">{selectedTask.task_description}</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Remarks (Optional)</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Add any notes about the task completion..."
                      rows={3}
                      className="w-full text-sm rounded-lg border border-gray-300 p-2.5 focus:border-[#991B1B] focus:ring-1 focus:ring-[#991B1B] outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 flex items-center justify-between">
                      <span>Proof of Completion</span>
                      {(selectedTask.require_attachment === true || selectedTask.require_attachment === 'Yes') && (
                        <span className="text-red-500 text-[10px] font-bold uppercase">Required</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="block w-full text-xs text-gray-500
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-full file:border-0
                                  file:text-xs file:font-semibold
                                  file:bg-red-50 file:text-[#991B1B]
                                  hover:file:bg-red-100
                                  cursor-pointer outline-none
                                "
                      />
                    </div>
                    {file && (
                      <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3 h-3" /> Selected: {file.name}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-[#991B1B] text-white rounded-xl hover:bg-[#7f1d1d] font-medium text-sm shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {uploading ? 'Uploading...' : 'Completing...'}
                      </>
                    ) : (
                      'Confirm Completion'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 ${toast.type === "error" ? "bg-red-900 text-white" : "bg-[#991B1B] text-white"
            }`}>
            {toast.type === "error" ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <p className="font-medium text-sm">{toast.message}</p>
          </div>
        )}

      </div>
    </AdminLayout >
  )
}
