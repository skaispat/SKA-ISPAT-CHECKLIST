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
    ChevronsRight
} from "lucide-react"

export default function AdminApproval() {
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState(null)

    // Rejection Modal State
    const [rejectModalOpen, setRejectModalOpen] = useState(false)
    const [selectedTaskToReject, setSelectedTaskToReject] = useState(null)
    const [rejectionReason, setRejectionReason] = useState("")

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
                .update({ status: "Yes" })
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
                    remarks: rejectionReason ? `[Rejected: ${rejectionReason}] ${selectedTaskToReject.remarks || ''}` : selectedTaskToReject.remarks
                    // Appending rejection reason to remarks so user can see it, 
                    // assumes we don't have a separate rejection_reason column.
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
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
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
                        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto px-1">
                            <select
                                value={filterDept}
                                onChange={(e) => setFilterDept(e.target.value)}
                                className="h-10 pl-3 pr-8 text-sm bg-gray-50 border-0 ring-1 ring-gray-200 rounded-lg focus:ring-2 focus:ring-[#991B1B]/10 focus:bg-white transition-all cursor-pointer min-w-[160px]"
                            >
                                <option value="all">All Departments</option>
                                {uniqueDepartments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                            <select
                                value={filterStaff}
                                onChange={(e) => setFilterStaff(e.target.value)}
                                className="h-10 pl-3 pr-8 text-sm bg-gray-50 border-0 ring-1 ring-gray-200 rounded-lg focus:ring-2 focus:ring-[#991B1B]/10 focus:bg-white transition-all cursor-pointer min-w-[160px]"
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
                                    className="ml-2 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap"
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
                                        <th className="px-6 py-4">Submission Time</th>
                                        <th className="px-6 py-4">Proof</th>
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
                                                    <p className="text-gray-500 text-xs line-clamp-2">{task.task_description}</p>
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
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                    {formatDate(task.actual)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                {task.uploaded_image ? (
                                                    <a
                                                        href={task.uploaded_image}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-[#991B1B] hover:text-[#7f1d1d] font-medium text-xs hover:underline"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        View Image
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">No attachment</span>
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
                                            <div className="font-semibold text-gray-900 line-clamp-2">{task.task_title}</div>
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

                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <span className="font-medium">User:</span> {task.name}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            <span>{formatDate(task.actual)}</span>
                                        </div>
                                    </div>

                                    {task.uploaded_image && (
                                        <a href={task.uploaded_image} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#991B1B] font-medium text-xs">
                                            <Eye className="w-3.5 h-3.5" /> View Proof
                                        </a>
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

            </div>
        </AdminLayout>
    )
}
