import { useState, useEffect } from "react"
import { supabase } from "../../supabase"
import AdminLayout from "../../components/layout/AdminLayout"
import {
    CheckCircle2,
    XCircle,
    Eye,
    Loader2,
    AlertCircle,
    FileCheck,
    Calendar,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Download,
    X,
    ExternalLink,
    RotateCw,
    ZoomIn,
    ZoomOut
} from "lucide-react"

export default function AdminApproval() {
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState(null)

    // Rejection Modal State
    const [rejectModalOpen, setRejectModalOpen] = useState(false)
    const [selectedTaskToReject, setSelectedTaskToReject] = useState(null)
    const [rejectionReason, setRejectionReason] = useState("")

    // Image Preview Modal State
    const [previewImageData, setPreviewImageData] = useState(null)

    const [activeTab, setActiveTab] = useState("pending")
    const [filterDept, setFilterDept] = useState("all")
    const [filterStaff, setFilterStaff] = useState("all")

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    useEffect(() => {
        setFilterDept("all")
        setFilterStaff("all")
        setCurrentPage(1)
    }, [activeTab])

    useEffect(() => {
        setCurrentPage(1)
    }, [filterDept, filterStaff])

    useEffect(() => {
        fetchTasks()
    }, [activeTab])

    const fetchTasks = async () => {
        try {
            setLoading(true)
            let query = supabase
                .from("master_tasks")
                .select("*")
                .neq("freq", "one-time")

            if (activeTab === 'pending') {
                query = query.eq("status", "pending_approval")
            } else if (activeTab === 'approved') {
                query = query.eq("status", "Yes").limit(50) // Limit to recent 50 to avoid fetch overload
            } else if (activeTab === 'rejected') {
                query = query.eq("status", "rejected")
            }

            const { data, error } = await query.order("actual", { ascending: false })

            if (error) throw error
            setTasks(data || [])
        } catch (error) {
            console.error("Error fetching tasks:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (task) => {
        try {
            setProcessingId(task.task_id)
            const { error } = await supabase
                .from("master_tasks")
                .update({ status: "Yes", admin_remark: "Approved" })
                .eq("task_id", task.task_id)

            if (error) throw error

            // Remove from list
            setTasks(prev => prev.filter(t => t.task_id !== task.task_id))
        } catch (error) {
            console.error("Error approving task:", error)
            alert("Failed to approve task")
        } finally {
            setProcessingId(null)
        }
    }

    const openRejectModal = (task) => {
        setSelectedTaskToReject(task)
        setRejectionReason("")
        setRejectModalOpen(true)
    }

    const handleRejectConfirm = async () => {
        if (!selectedTaskToReject) return

        try {
            setProcessingId(selectedTaskToReject.task_id)
            const { error } = await supabase
                .from("master_tasks")
                .update({
                    status: "rejected",
                    admin_remark: rejectionReason
                })
                .eq("task_id", selectedTaskToReject.task_id)

            if (error) throw error

            setTasks(prev => prev.filter(t => t.task_id !== selectedTaskToReject.task_id))
            setRejectModalOpen(false)
            setSelectedTaskToReject(null)
        } catch (error) {
            console.error("Error rejecting task:", error)
            alert("Failed to reject task")
        } finally {
            setProcessingId(null)
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return "N/A"
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
    }

    const handleDownloadImage = async (url, taskId, index) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `task_${taskId}_image_${index + 1}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Error downloading image:", error);
            window.open(url, '_blank');
        }
    }

    const uniqueDepartments = [...new Set(tasks.map(t => t.department))].filter(Boolean).sort()
    const uniqueStaff = [...new Set(tasks.map(t => t.name))].filter(Boolean).sort()

    const filteredTasks = tasks.filter(task => {
        const matchDept = filterDept === "all" || task.department === filterDept
        const matchStaff = filterStaff === "all" || task.name === filterStaff
        return matchDept && matchStaff
    })

    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage)
    const currentTasks = filteredTasks.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )


    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <FileCheck className="h-8 w-8 text-[#991B1B]" />
                        Admin Approval
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Review tasks completed by users.
                    </p>
                </div>

                {/* Unified Toolbar: Tabs & Filters */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-top-1">
                    {/* Tabs */}
                    <div className="flex p-1 bg-gray-100/50 rounded-xl w-full xl:w-auto overflow-x-auto">
                        {['pending', 'approved', 'rejected'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 xl:flex-none px-6 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === tab
                                    ? 'bg-white text-[#991B1B] shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)} {tab === 'pending' && 'Approval'}
                            </button>
                        ))}
                    </div>

                    {/* Filters */}
                    {tasks.length > 0 && (
                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto px-1">
                            <select
                                value={filterDept}
                                onChange={(e) => setFilterDept(e.target.value)}
                                className="h-10 pl-3 pr-8 text-sm bg-gray-50 border-0 ring-1 ring-gray-200 rounded-lg focus:ring-2 focus:ring-[#991B1B]/10 focus:bg-white transition-all cursor-pointer w-full sm:w-auto sm:min-w-[160px]"
                            >
                                <option value="all">All Departments</option>
                                {uniqueDepartments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                            <select
                                value={filterStaff}
                                onChange={(e) => setFilterStaff(e.target.value)}
                                className="h-10 pl-3 pr-8 text-sm bg-gray-50 border-0 ring-1 ring-gray-200 rounded-lg focus:ring-2 focus:ring-[#991B1B]/10 focus:bg-white transition-all cursor-pointer w-full sm:w-auto sm:min-w-[160px]"
                            >
                                <option value="all">All Staff</option>
                                {uniqueStaff.map(staff => (
                                    <option key={staff} value={staff}>{staff}</option>
                                ))}
                            </select>
                            {(filterDept !== "all" || filterStaff !== "all") && (
                                <button
                                    onClick={() => {
                                        setFilterDept("all")
                                        setFilterStaff("all")
                                    }}
                                    className="col-span-2 sm:col-span-1 sm:ml-2 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap text-center"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 text-[#991B1B] animate-spin mb-4" />
                        <p className="text-gray-500">Loading tasks...</p>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200 shadow-sm">
                        <div className="mx-auto h-12 w-12 text-gray-400 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">
                            {tasks.length === 0 ? "All caught up!" : "No matches found"}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {tasks.length === 0
                                ? (activeTab === 'pending' ? "No tasks waiting for approval." : activeTab === 'approved' ? "No approved tasks found." : "No rejected tasks found.")
                                : "No tasks match the selected filters."}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4">Task Details</th>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Department</th>
                                        <th className="px-6 py-4">Area</th>
                                        <th className="px-6 py-4">Start Date</th>
                                        <th className="px-6 py-4">Submission Time</th>
                                        <th className="px-6 py-4">Proof</th>
                                        <th className="px-6 py-4">Admin Remarks</th>
                                        <th className="px-6 py-4 text-right">
                                            {activeTab === 'pending' ? 'Actions' : 'Status'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {currentTasks.map((task) => (
                                        <tr key={task.task_id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 align-top max-w-xs">
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-gray-900">{task.task_title}</p>
                                                    <p className="text-gray-500 text-xs">{task.task_description}</p>
                                                    {task.remarks && (
                                                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 border border-gray-100">
                                                            <span className="font-semibold">User Note:</span> {task.remarks}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                    {task.name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 align-top whitespace-nowrap text-gray-600">
                                                {task.department}
                                            </td>
                                            <td className="px-6 py-4 align-top whitespace-nowrap text-gray-600">
                                                {task.location}
                                            </td>
                                            <td className="px-6 py-4 align-top whitespace-nowrap text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                    {formatDate(task.task_start_date)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top whitespace-nowrap text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                    {formatDate(task.actual)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                {task.uploaded_image ? (
                                                    <div className="flex flex-col gap-1.5">
                                                        {task.uploaded_image.split(',').filter(Boolean).map((url, index) => (
                                                            <div key={index} className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewImageData({
                                                                        images: task.uploaded_image.split(',').filter(Boolean),
                                                                        currentIndex: index,
                                                                        taskTitle: task.task_title,
                                                                        taskDescription: task.task_description,
                                                                        userName: task.name,
                                                                        taskId: task.task_id
                                                                    })}
                                                                    className="inline-flex items-center gap-1.5 text-[#991B1B] hover:text-[#7f1d1d] font-medium text-xs hover:underline cursor-pointer"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                    View Image {index + 1}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDownloadImage(url, task.task_id, index)}
                                                                    className="p-1 text-gray-500 hover:text-[#991B1B] hover:bg-red-50 rounded transition-colors"
                                                                    title="Download Image"
                                                                >
                                                                    <Download className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">No attachment</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                {task.admin_remark ? (
                                                    <div className="p-2 bg-amber-50 rounded text-xs text-amber-700 border border-amber-100">
                                                        {task.admin_remark}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 align-top text-right">
                                                {activeTab === 'pending' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleApprove(task)}
                                                            disabled={processingId === task.task_id}
                                                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[70px]"
                                                            title="Approve Task"
                                                        >
                                                            {processingId === task.task_id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Approve"}
                                                        </button>
                                                        <button
                                                            onClick={() => openRejectModal(task)}
                                                            disabled={processingId === task.task_id}
                                                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[70px]"
                                                            title="Reject Task"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                                {activeTab === 'approved' && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                                        Approved
                                                    </span>
                                                )}
                                                {activeTab === 'rejected' && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                                        Rejected
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List View */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {currentTasks.map((task) => (
                                <div key={task.task_id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="font-semibold text-gray-900">{task.task_title}</div>
                                            <div className="text-xs text-gray-500">{task.task_description}</div>
                                        </div>
                                        {activeTab === 'approved' && <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">Approved</span>}
                                        {activeTab === 'rejected' && <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700">Rejected</span>}
                                    </div>

                                    {task.remarks && (
                                        <div className="p-2 bg-gray-50 rounded text-xs text-gray-600 border border-gray-100">
                                            <span className="font-semibold">User Note:</span> {task.remarks}
                                        </div>
                                    )}

                                    {task.admin_remark && (
                                        <div className="p-2 bg-amber-50 rounded text-xs text-amber-700 border border-amber-100">
                                            <span className="font-semibold">Admin Remark:</span> {task.admin_remark}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <span className="font-medium">User:</span> {task.name}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="font-medium">Area:</span> {task.location}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            <span>{formatDate(task.actual)}</span>
                                        </div>
                                    </div>

                                    {task.uploaded_image && (
                                        <div className="flex flex-col gap-2">
                                            {task.uploaded_image.split(',').filter(Boolean).map((url, index) => (
                                                <div key={index} className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewImageData({
                                                            images: task.uploaded_image.split(',').filter(Boolean),
                                                            currentIndex: index,
                                                            taskTitle: task.task_title,
                                                            taskDescription: task.task_description,
                                                            userName: task.name,
                                                            taskId: task.task_id
                                                        })}
                                                        className="inline-flex items-center gap-1.5 text-[#991B1B] font-medium text-xs hover:underline cursor-pointer"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> View Proof {index + 1}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadImage(url, task.task_id, index)}
                                                        className="p-1 text-gray-500 hover:text-[#991B1B] hover:bg-red-50 rounded transition-colors"
                                                        title="Download Image"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {activeTab === 'pending' && (
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={() => handleApprove(task)}
                                                disabled={processingId === task.task_id}
                                                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                                            >
                                                {processingId === task.task_id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Approve"}
                                            </button>
                                            <button
                                                onClick={() => openRejectModal(task)}
                                                disabled={processingId === task.task_id}
                                                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pagination Controls */}
                {filteredTasks.length > 0 && (
                    <div className="flex items-center justify-between px-2 pt-2 pb-6 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                            Showing <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filteredTasks.length)}</span> of <span className="font-medium text-gray-900">{filteredTasks.length}</span> results
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-gray-500"
                                title="First Page"
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-gray-500"
                                title="Previous Page"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            <div className="flex items-center gap-1 px-2">
                                <span className="text-xs font-semibold text-gray-900">Page {currentPage}</span>
                                <span className="text-xs text-gray-400">/</span>
                                <span className="text-xs font-medium text-gray-500">{Math.max(1, totalPages)}</span>
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage >= totalPages}
                                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-gray-500"
                                title="Next Page"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage >= totalPages}
                                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-gray-500"
                                title="Last Page"
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Rejection Modal */}
                {rejectModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-5 border-b border-gray-100">
                                <h3 className="font-bold text-lg text-gray-900">Reject Task</h3>
                                <p className="text-sm text-gray-500 mt-1">Please provide a reason for rejection.</p>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Rejection Reason</label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="E.g. Image is blurry, Task incomplete..."
                                        rows={4}
                                        className="w-full text-sm rounded-lg border border-gray-300 p-3 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                        autoFocus
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setRejectModalOpen(false)}
                                        className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRejectConfirm}
                                        disabled={!rejectionReason.trim() || processingId === selectedTaskToReject?.task_id}
                                        className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processingId === selectedTaskToReject?.task_id ? 'Rejecting...' : 'Confirm Reject'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Image Preview Modal */}
                {previewImageData && (
                    <ImagePreviewModal
                        data={previewImageData}
                        onClose={() => setPreviewImageData(null)}
                    />
                )}

            </div>
        </AdminLayout>
    )
}

// Image Preview Modal Component
function ImagePreviewModal({ data, onClose }) {
    const { images = [], taskTitle = "", taskDescription = "", userName = "", taskId = "" } = data || {}
    const [currentIndex, setCurrentIndex] = useState(data?.currentIndex || 0)
    const [isZoomed, setIsZoomed] = useState(false)
    const [rotation, setRotation] = useState(0)
    const [imageLoading, setImageLoading] = useState(true)
    const [isConvertingHeic, setIsConvertingHeic] = useState(false)
    const [displayUrl, setDisplayUrl] = useState("")
    const [isPdf, setIsPdf] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [convertedCache, setConvertedCache] = useState({})

    const currentUrl = images[currentIndex] || ""

    // Convert URL to local Blob URL to bypass server "Content-Disposition: attachment" headers
    useEffect(() => {
        let active = true
        let blobUrlToRevoke = null

        const prepareMedia = async () => {
            setImageLoading(true)
            setHasError(false)
            setIsZoomed(false)
            setRotation(0)
            setIsConvertingHeic(false)

            if (!currentUrl) {
                setImageLoading(false)
                return
            }

            // Check if already converted in session cache
            if (convertedCache[currentUrl]) {
                setDisplayUrl(convertedCache[currentUrl])
                setImageLoading(false)
                return
            }

            const cleanUrl = currentUrl.toLowerCase().split('?')[0]
            const isPdfExt = cleanUrl.endsWith('.pdf')
            let isHeic = cleanUrl.endsWith('.heic') || cleanUrl.endsWith('.heif') || cleanUrl.includes('.heic') || cleanUrl.includes('.heif')

            try {
                // Fetch the image data directly as a Blob
                // This strips any Content-Disposition: attachment header sent by Supabase
                const response = await fetch(currentUrl)
                if (!response.ok) throw new Error("Failed to fetch image stream")

                let blob = await response.blob()
                if (!active) return

                if (blob.type === 'application/pdf' || isPdfExt) {
                    setIsPdf(true)
                } else {
                    setIsPdf(false)
                }

                // Detect HEIC from MIME or ISOBMFF header inspection if not already detected by URL
                if (!isHeic) {
                    const mime = (blob.type || "").toLowerCase()
                    if (mime.includes('heic') || mime.includes('heif')) {
                        isHeic = true
                    } else if (blob.size >= 16) {
                        try {
                            const head = await blob.slice(0, 64).arrayBuffer()
                            const headStr = new TextDecoder("ascii").decode(head)
                            if (headStr.includes("ftyp")) {
                                const brands = ["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heif", "heim", "heis"]
                                if (brands.some(b => headStr.includes(b))) {
                                    isHeic = true
                                }
                            }
                        } catch {
                            // ignore detection error
                        }
                    }
                }

                // If HEIC / HEIF, convert to JPEG for native browser rendering
                if (isHeic) {
                    setIsConvertingHeic(true)
                    let convertedBlob = null
                    try {
                        const { heicTo } = await import("heic-to")
                        convertedBlob = await heicTo({
                            blob: blob,
                            type: "image/jpeg",
                            quality: 0.9
                        })
                    } catch (heicToErr) {
                        console.warn("heic-to conversion failed, trying fallback:", heicToErr)
                        try {
                            const heic2anyModule = await import("heic2any")
                            const heic2any = heic2anyModule.default || heic2anyModule
                            const typedBlob = (blob.type && (blob.type.includes("heic") || blob.type.includes("heif")))
                                ? blob
                                : new Blob([blob], { type: "image/heic" })
                            const converted = await heic2any({
                                blob: typedBlob,
                                toType: "image/jpeg",
                                quality: 0.88
                            })
                            convertedBlob = Array.isArray(converted) ? converted[0] : converted
                        } catch (fallbackErr) {
                            console.error("All HEIC converters failed:", fallbackErr)
                        }
                    }

                    if (convertedBlob) {
                        blob = convertedBlob
                    } else {
                        // If conversion could not decode the image, display the unsupported fallback card
                        if (!active) return
                        setIsConvertingHeic(false)
                        setImageLoading(false)
                        setHasError(true)
                        return
                    }
                }

                const localUrl = window.URL.createObjectURL(blob)
                blobUrlToRevoke = localUrl
                setDisplayUrl(localUrl)
                setConvertedCache(prev => ({ ...prev, [currentUrl]: localUrl }))
                setIsConvertingHeic(false)
                setImageLoading(false)
            } catch (err) {
                console.error("Error preparing image preview:", err)
                if (!active) return
                setIsConvertingHeic(false)
                if (isHeic) {
                    setImageLoading(false)
                    setHasError(true)
                } else {
                    // Fall back to raw URL
                    setDisplayUrl(currentUrl)
                    setImageLoading(false)
                }
            }
        }

        prepareMedia()

        return () => {
            active = false
            if (blobUrlToRevoke) {
                window.URL.revokeObjectURL(blobUrlToRevoke)
            }
        }
    }, [currentUrl])

    // Keyboard navigation (Esc, Left, Right)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose()
            } else if (e.key === "ArrowLeft" && images.length > 1) {
                setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
            } else if (e.key === "ArrowRight" && images.length > 1) {
                setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [images.length, onClose])

    const handleDownload = async () => {
        if (!currentUrl) return
        try {
            // If displayUrl is a converted Blob URL (e.g. from HEIC), download the JPEG directly
            if (displayUrl && displayUrl.startsWith("blob:")) {
                const link = document.createElement("a")
                link.href = displayUrl
                let filename = currentUrl.split("/").pop()?.split("?")[0] || `task_${taskId}_image_${currentIndex + 1}.jpg`
                filename = filename.replace(/\.(heic|heif)$/i, ".jpg")
                if (!filename.toLowerCase().endsWith(".jpg") && !filename.toLowerCase().endsWith(".jpeg") && !filename.toLowerCase().endsWith(".png") && !filename.toLowerCase().endsWith(".pdf")) {
                    filename += ".jpg"
                }
                link.download = filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                return
            }

            const response = await fetch(currentUrl)
            const blob = await response.blob()
            const blobUrl = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = blobUrl
            const filename = currentUrl.split("/").pop()?.split("?")[0] || `task_${taskId}_image_${currentIndex + 1}.jpg`
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(blobUrl)
        } catch {
            window.open(currentUrl, "_blank")
        }
    }

    const handleOpenInNewTab = () => {
        const targetUrl = displayUrl || currentUrl
        const newWin = window.open('', '_blank')
        if (newWin) {
            if (isPdf) {
                newWin.location.href = targetUrl
            } else {
                newWin.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${taskTitle || 'Task Proof'}</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { margin:0; background:#0b0f19; display:flex; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; }
                            img { max-width:98vw; max-height:98vh; object-fit:contain; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.5); }
                        </style>
                    </head>
                    <body>
                        <img src="${targetUrl}" alt="${taskTitle || 'Task proof'}" />
                    </body>
                    </html>
                `)
                newWin.document.close()
            }
        } else {
            window.open(targetUrl, '_blank')
        }
    }

    if (!currentUrl) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/80">
                    <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900 truncate max-w-md">
                                {taskTitle || "Task Proof Image"}
                            </span>
                            {taskId && (
                                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 shrink-0">
                                    #{taskId}
                                </span>
                            )}
                            {userName && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium shrink-0">
                                    {userName}
                                </span>
                            )}
                        </div>
                        {images.length > 1 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                                Showing image {currentIndex + 1} of {images.length}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {!isPdf && !hasError && (
                            <>
                                {/* Zoom toggle button */}
                                <button
                                    type="button"
                                    onClick={() => setIsZoomed(!isZoomed)}
                                    className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                                    title={isZoomed ? "Zoom Out" : "Zoom In"}
                                >
                                    {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                                </button>

                                {/* Rotate button */}
                                <button
                                    type="button"
                                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                                    className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                                    title="Rotate 90°"
                                >
                                    <RotateCw className="h-4 w-4" />
                                </button>
                            </>
                        )}

                        {/* Download button */}
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="p-2 text-gray-500 hover:text-[#991B1B] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Download Image"
                        >
                            <Download className="h-4 w-4" />
                        </button>

                        {/* Open in new tab (bypasses direct download) */}
                        <button
                            type="button"
                            onClick={handleOpenInNewTab}
                            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                            title="Open view in new tab"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </button>

                        <div className="h-4 w-px bg-gray-200 mx-1" />

                        {/* Close button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                            title="Close (Esc)"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Display Area */}
                <div className="relative flex-1 bg-gray-900/5 overflow-auto flex items-center justify-center p-4 min-h-[320px] max-h-[70vh]">
                    {imageLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 z-10 backdrop-blur-[2px]">
                            <Loader2 className="h-8 w-8 animate-spin text-[#991B1B]" />
                            <span className="text-xs text-gray-600 font-medium">
                                {isConvertingHeic || currentUrl?.toLowerCase().includes('.heic') || currentUrl?.toLowerCase().includes('.heif')
                                    ? "Converting iPhone / HEIC image for preview..."
                                    : "Loading image..."}
                            </span>
                        </div>
                    )}

                    {hasError ? (
                        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center max-w-sm">
                            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Preview not supported inline</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    The image format or server settings require direct download to view.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleDownload}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#991B1B] text-white text-xs font-semibold rounded-lg hover:bg-[#7f1d1d] shadow-sm transition-all cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Download File to View
                            </button>
                        </div>
                    ) : isPdf ? (
                        <iframe
                            src={displayUrl || currentUrl}
                            title="PDF Document"
                            className="w-full h-[66vh] rounded-lg border border-gray-200 bg-white"
                        />
                    ) : (
                        <div className="relative flex items-center justify-center w-full h-full overflow-hidden">
                            <img
                                src={displayUrl || currentUrl}
                                alt={taskTitle || "Task proof"}
                                onLoad={() => setImageLoading(false)}
                                onError={() => {
                                    setImageLoading(false)
                                    setHasError(true)
                                }}
                                onClick={() => setIsZoomed(!isZoomed)}
                                className={`max-h-[66vh] max-w-full object-contain rounded-lg shadow-sm transition-all duration-200 select-none ${isZoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in hover:opacity-95"
                                    }`}
                                style={{
                                    transform: `rotate(${rotation}deg) ${isZoomed ? "scale(1.5)" : "scale(1)"}`,
                                }}
                            />
                        </div>
                    )}

                    {/* Previous Button */}
                    {images.length > 1 && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-md backdrop-blur-sm transition-all hover:scale-105 cursor-pointer z-10 border border-gray-200"
                            title="Previous Image (←)"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                    )}

                    {/* Next Button */}
                    {images.length > 1 && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-md backdrop-blur-sm transition-all hover:scale-105 cursor-pointer z-10 border border-gray-200"
                            title="Next Image (→)"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* Footer with Thumbnails (if multiple images) */}
                {images.length > 1 && (
                    <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-center gap-2 overflow-x-auto">
                        {images.map((url, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setCurrentIndex(idx)}
                                className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${currentIndex === idx
                                        ? "border-[#991B1B] ring-2 ring-[#991B1B]/20 scale-105"
                                        : "border-transparent opacity-60 hover:opacity-100"
                                    }`}
                            >
                                <img
                                    src={convertedCache[url] || (currentIndex === idx && displayUrl ? displayUrl : url)}
                                    alt={`Thumbnail ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        if (e.currentTarget.nextSibling) {
                                            e.currentTarget.nextSibling.style.display = 'flex';
                                        }
                                    }}
                                />
                                <span
                                    style={{ display: 'none' }}
                                    className="w-full h-full items-center justify-center bg-gray-200 text-[11px] font-bold text-gray-600"
                                >
                                    #{idx + 1}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
