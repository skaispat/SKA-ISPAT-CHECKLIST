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
    ExternalLink
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

    // Format any DB date/timestamp in IST (Asia/Kolkata), regardless of the viewer's browser timezone
    const formatDate = (dateString) => {
        if (!dateString) return "N/A"
        const raw = String(dateString).trim()

        // Pure date (e.g. "2026-11-21") — no time component, show date only
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            const [y, m, d] = raw.split("-").map(Number)
            return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
                timeZone: "UTC",
                day: "2-digit",
                month: "short",
                year: "numeric"
            })
        }

        // Timestamps without an explicit offset are stored as UTC — mark them as such
        const hasTz = /([zZ]|[+-]\d{2}(:?\d{2})?)$/.test(raw)
        const parsed = new Date(hasTz ? raw : raw.replace(" ", "T") + "Z")
        if (isNaN(parsed.getTime())) return raw

        return parsed.toLocaleString("en-GB", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        })
    }

    const formatDoers = (doers) => {
        if (Array.isArray(doers)) return doers.filter(Boolean).join(", ")
        return doers || ""
    }

    // Utility: escape strings to prevent XSS vulnerabilities in dynamic tab documents
    const escapeHtml = (str) => {
        if (str == null) return ""
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
    }

    // Utility: extract clean, safe filename from URL
    const getSafeFilename = (rawUrl, fallbackName) => {
        try {
            const parsed = new URL(rawUrl)
            const name = parsed.pathname.split("/").pop()
            return name ? decodeURIComponent(name) : fallbackName
        } catch {
            return (rawUrl || "").split("/").pop()?.split("?")[0]?.split("#")[0] || fallbackName
        }
    }

    const handleDownloadImage = async (url, taskId, index) => {
        try {
            const response = await fetch(url);
            let blob = await response.blob();
            const cleanUrl = url.toLowerCase().split('?')[0];
            const isHeic = cleanUrl.endsWith('.heic') || cleanUrl.endsWith('.heif') || cleanUrl.includes('.heic') || cleanUrl.includes('.heif');
            if (isHeic) {
                try {
                    const { heicTo } = await import("heic-to");
                    const converted = await heicTo({ blob, type: "image/jpeg", quality: 0.9 });
                    blob = converted;
                } catch (convErr) {
                    console.warn("HEIC conversion for download failed, downloading original:", convErr);
                }
            }
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            const safeName = getSafeFilename(url, `task_${taskId}_image_${index + 1}.jpg`);
            link.download = safeName.replace(/\.(heic|heif)$/i, ".jpg");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Error downloading image:", error);
            window.open(url, '_blank');
        }
    }

    const handleViewImageInNewTab = async (url, task, index) => {
        if (!url) return;

        // 1. Open new tab synchronously on click to prevent pop-up blocker
        const newTab = window.open('', '_blank');
        if (!newTab) {
            window.open(url, '_blank');
            return;
        }

        const rawTitle = task?.task_title || "Task Proof";
        const safeTitle = escapeHtml(rawTitle);
        const taskIdStr = task?.task_id ? `#${task.task_id}` : "";
        const safeTaskId = escapeHtml(taskIdStr);
        const cleanUrl = url.toLowerCase().split('?')[0];
        const isPdf = cleanUrl.endsWith('.pdf');
        let isHeic = cleanUrl.endsWith('.heic') || cleanUrl.endsWith('.heif') || cleanUrl.includes('.heic') || cleanUrl.includes('.heif');

        // 2. Initial loading state in the new tab
        try {
            newTab.document.write(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${safeTitle} - Proof Image ${index + 1}</title>
                    <style>
                        body {
                            margin: 0;
                            background: #0b0f19;
                            color: #f1f5f9;
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            min-height: 100vh;
                        }
                        .spinner {
                            border: 3px solid rgba(255, 255, 255, 0.1);
                            border-top: 3px solid #ef4444;
                            border-radius: 50%;
                            width: 38px;
                            height: 38px;
                            animation: spin 0.8s linear infinite;
                            margin-bottom: 16px;
                        }
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                        .msg { font-size: 14px; color: #94a3b8; font-weight: 500; }
                    </style>
                </head>
                <body>
                    <div class="spinner"></div>
                    <div class="msg" id="status-msg">${isHeic ? "Converting iPhone HEIC image for preview..." : "Loading image..."}</div>
                </body>
                </html>
            `);
            newTab.document.close();
        } catch (e) {
            console.warn("Could not write initial tab state:", e);
        }

        let blobUrlToRevoke = null;

        try {
            // 3. Fetch as blob to strip server Content-Disposition: attachment header
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error ${response.status}: Failed to fetch image`);

            let blob = await response.blob();

            // If user closed tab while fetching, abort cleanly
            if (newTab.closed) return;

            // PDF handling: open in browser PDF engine
            if (blob.type === 'application/pdf' || isPdf) {
                const pdfBlobUrl = URL.createObjectURL(blob);
                blobUrlToRevoke = pdfBlobUrl;
                newTab.location.href = pdfBlobUrl;
                return;
            }

            // 4. Inspect binary magic bytes if not detected by extension
            if (!isHeic) {
                const mime = (blob.type || "").toLowerCase();
                if (mime.includes('heic') || mime.includes('heif')) {
                    isHeic = true;
                } else if (blob.size >= 16) {
                    try {
                        const head = await blob.slice(0, 64).arrayBuffer();
                        const headStr = new TextDecoder("ascii").decode(head);
                        if (headStr.includes("ftyp")) {
                            const brands = ["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heif", "heim", "heis"];
                            if (brands.some(b => headStr.includes(b))) {
                                isHeic = true;
                            }
                        }
                    } catch { }
                }
            }

            // 5. HEIC Conversion (heic-to with heic2any fallback)
            if (isHeic) {
                if (!newTab.closed) {
                    const msgEl = newTab.document.getElementById('status-msg');
                    if (msgEl) msgEl.textContent = "Converting iPhone HEIC image for preview...";
                }

                let convertedBlob = null;
                try {
                    const { heicTo } = await import("heic-to");
                    convertedBlob = await heicTo({
                        blob: blob,
                        type: "image/jpeg",
                        quality: 0.9
                    });
                } catch (err1) {
                    try {
                        const heic2anyModule = await import("heic2any");
                        const heic2any = heic2anyModule.default || heic2anyModule;
                        const typedBlob = (blob.type && (blob.type.includes("heic") || blob.type.includes("heif")))
                            ? blob
                            : new Blob([blob], { type: "image/heic" });
                        const res = await heic2any({
                            blob: typedBlob,
                            toType: "image/jpeg",
                            quality: 0.88
                        });
                        convertedBlob = Array.isArray(res) ? res[0] : res;
                    } catch (err2) {
                        console.error("HEIC conversion error:", err2);
                    }
                }

                if (convertedBlob) {
                    blob = convertedBlob;
                }
            }

            if (newTab.closed) return;

            const blobUrl = URL.createObjectURL(blob);
            blobUrlToRevoke = blobUrl;

            // Clean, safe filename for download
            const rawFilename = getSafeFilename(url, `task_${task?.task_id || 'proof'}_image_${index + 1}.jpg`);
            const downloadFilename = escapeHtml(rawFilename.replace(/\.(heic|heif)$/i, ".jpg"));

            // Memory cleanup: revoke blob URL when tab is closed
            try {
                newTab.addEventListener('pagehide', () => {
                    try { URL.revokeObjectURL(blobUrl); } catch { }
                }, { once: true });
            } catch { }

            // 6. Render complete modern image viewer in the new tab
            newTab.document.open();
            newTab.document.write(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${safeTitle} ${safeTaskId ? '(' + safeTaskId + ')' : ''} - Image ${index + 1}</title>
                    <style>
                        * { box-sizing: border-box; }
                        body {
                            margin: 0;
                            padding: 0;
                            background: #0b0f19;
                            color: #f1f5f9;
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                            height: 100vh;
                            display: flex;
                            flex-direction: column;
                            overflow: hidden;
                            user-select: none;
                        }
                        header {
                            height: 54px;
                            background: rgba(15, 23, 42, 0.9);
                            backdrop-filter: blur(8px);
                            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 0 18px;
                            z-index: 10;
                            flex-shrink: 0;
                        }
                        .title-wrap {
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            overflow: hidden;
                        }
                        .task-title {
                            font-size: 14px;
                            font-weight: 600;
                            color: #f8fafc;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            max-width: 50vw;
                        }
                        .task-badge {
                            background: rgba(153, 27, 27, 0.2);
                            color: #f87171;
                            border: 1px solid rgba(153, 27, 27, 0.4);
                            font-size: 11px;
                            font-weight: 600;
                            padding: 2px 8px;
                            border-radius: 9999px;
                        }
                        .actions {
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        }
                        .btn {
                            background: rgba(255, 255, 255, 0.08);
                            border: 1px solid rgba(255, 255, 255, 0.12);
                            color: #e2e8f0;
                            font-size: 12px;
                            font-weight: 500;
                            padding: 6px 12px;
                            border-radius: 6px;
                            cursor: pointer;
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                            text-decoration: none;
                            transition: all 0.15s ease;
                        }
                        .btn:hover {
                            background: rgba(255, 255, 255, 0.15);
                            color: #ffffff;
                        }
                        .btn-download {
                            background: #991b1b;
                            border-color: #7f1d1d;
                            color: #ffffff;
                        }
                        .btn-download:hover {
                            background: #b91c1c;
                        }
                        .canvas-wrap {
                            flex: 1;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            overflow: auto;
                            padding: 16px;
                            position: relative;
                            touch-action: pan-x pan-y pinch-zoom;
                        }
                        img {
                            max-width: 95vw;
                            max-height: calc(100vh - 86px);
                            object-fit: contain;
                            border-radius: 8px;
                            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
                            transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                            cursor: zoom-in;
                        }
                        img.zoomed {
                            max-width: none;
                            max-height: none;
                            cursor: zoom-out;
                            transform-origin: center center;
                        }
                    </style>
                </head>
                <body>
                    <header>
                        <div class="title-wrap" title="${safeTitle}">
                            <span class="task-title">${safeTitle}</span>
                            ${safeTaskId ? `<span class="task-badge">${safeTaskId}</span>` : ''}
                            <span style="font-size: 12px; color: #94a3b8;">Image ${index + 1}</span>
                        </div>
                        <div class="actions">
                            <button class="btn" id="rotate-btn" title="Rotate 90° (R)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                                Rotate
                            </button>
                            <button class="btn" id="zoom-btn" title="Toggle Zoom (Z)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                                Zoom
                            </button>
                            <a class="btn btn-download" href="${blobUrl}" download="${downloadFilename}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Download
                            </a>
                        </div>
                    </header>
                    <div class="canvas-wrap" id="stage">
                        <img id="view-img" src="${blobUrl}" alt="${safeTitle}" />
                    </div>
                    <script>
                        let rotation = 0;
                        let zoomed = false;
                        const img = document.getElementById('view-img');
                        const rotateBtn = document.getElementById('rotate-btn');
                        const zoomBtn = document.getElementById('zoom-btn');

                        function updateTransform() {
                            img.style.transform = 'rotate(' + rotation + 'deg) ' + (zoomed ? 'scale(1.8)' : 'scale(1)');
                        }

                        rotateBtn.addEventListener('click', () => {
                            rotation = (rotation + 90) % 360;
                            updateTransform();
                        });

                        zoomBtn.addEventListener('click', () => {
                            zoomed = !zoomed;
                            img.classList.toggle('zoomed', zoomed);
                            updateTransform();
                        });

                        img.addEventListener('click', () => {
                            zoomed = !zoomed;
                            img.classList.toggle('zoomed', zoomed);
                            updateTransform();
                        });

                        window.addEventListener('keydown', (e) => {
                            if (e.key === 'r' || e.key === 'R') {
                                rotation = (rotation + 90) % 360;
                                updateTransform();
                            } else if (e.key === 'z' || e.key === 'Z') {
                                zoomed = !zoomed;
                                img.classList.toggle('zoomed', zoomed);
                                updateTransform();
                            } else if (e.key === 'Escape') {
                                window.close();
                            }
                        });
                    <\/script>
                </body>
                </html>
            `);
            newTab.document.close();
        } catch (fetchErr) {
            console.error("Error opening image in new tab:", fetchErr);
            if (blobUrlToRevoke) {
                try { URL.revokeObjectURL(blobUrlToRevoke); } catch { }
            }
            if (newTab && !newTab.closed) {
                try {
                    newTab.document.open();
                    newTab.document.write(`
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Preview Error</title>
                            <style>
                                body {
                                    margin: 0;
                                    background: #0b0f19;
                                    color: #f1f5f9;
                                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                    justify-content: center;
                                    min-height: 100vh;
                                    text-align: center;
                                    padding: 24px;
                                }
                                h2 { font-size: 18px; margin: 0 0 8px 0; color: #f87171; }
                                p { font-size: 13px; color: #94a3b8; margin: 0 0 20px 0; max-width: 380px; }
                                .btn {
                                    background: #991b1b;
                                    color: white;
                                    border: none;
                                    padding: 10px 20px;
                                    border-radius: 8px;
                                    font-size: 13px;
                                    font-weight: 500;
                                    text-decoration: none;
                                    cursor: pointer;
                                }
                            </style>
                        </head>
                        <body>
                            <h2>Could not stream image inline</h2>
                            <p>Directly access the server file or check your connection.</p>
                            <a class="btn" href="${escapeHtml(url)}" target="_self">Open Direct File URL</a>
                        </body>
                        </html>
                    `);
                    newTab.document.close();
                } catch {
                    newTab.location.href = url;
                }
            }
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
                                        {activeTab === 'pending' && <th className="px-6 py-4">Doer Name</th>}
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
                                            {activeTab === 'pending' && (
                                                <td className="px-6 py-4 align-top whitespace-nowrap text-gray-700">
                                                    {formatDoers(task.doers_name) || <span className="text-gray-400 text-xs italic">-</span>}
                                                </td>
                                            )}
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
                                                                <a
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        handleViewImageInNewTab(url, task, index);
                                                                    }}
                                                                    className="inline-flex items-center gap-1.5 text-[#991B1B] hover:text-[#7f1d1d] font-medium text-xs hover:underline cursor-pointer"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                    View Image {index + 1}
                                                                </a>
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

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <span className="font-medium">User:</span> {task.name}
                                        </div>
                                        {activeTab === 'pending' && formatDoers(task.doers_name) && (
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium">Doer:</span> {formatDoers(task.doers_name)}
                                            </div>
                                        )}
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
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleViewImageInNewTab(url, task, index);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 text-[#991B1B] font-medium text-xs hover:underline cursor-pointer"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> View Proof {index + 1}
                                                    </a>
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

            </div>
        </AdminLayout>
    )
}
