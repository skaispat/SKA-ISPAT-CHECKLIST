"use client"

import { useState, useEffect, useMemo } from "react"
import { BarChart3, CheckCircle2, Clock, ListTodo, Users, AlertTriangle, Filter, ArrowRight, LayoutDashboard, FileBarChart, UserCheck, ChevronDown, X, ChevronLeft, ChevronRight, Search } from 'lucide-react'



import AdminLayout from "../../components/layout/AdminLayout.jsx"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from "recharts"
import { supabase } from "../../supabase"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'


interface Task {
    id: string | number;
    title: string;
    assignedTo: string;
    dueDate: string;
    status: string;
    frequency: string;
    [key: string]: any;
}

export default function AdminDashboard() {
    const [taskView, setTaskView] = useState("recent")
    const [filterStatus, setFilterStatus] = useState("all")
    const [filterStaff, setFilterStaff] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("overview")
    const [visibleTasksCount, setVisibleTasksCount] = useState(10)
    const [filterDate, setFilterDate] = useState("")

    // State for Staff Performance Month/Year Filter
    const [performanceMonth, setPerformanceMonth] = useState(new Date().getMonth())
    const [performanceYear, setPerformanceYear] = useState(new Date().getFullYear())

    // State for Tasks Overview Month/Year Filter
    const [overviewMonth, setOverviewMonth] = useState(-1) // -1 for All Months
    const [overviewYear, setOverviewYear] = useState(new Date().getFullYear())

    // State for Stat Modal
    const [statModal, setStatModal] = useState<{ isOpen: boolean; type: string | null; title: string }>({
        isOpen: false,
        type: null,
        title: ""
    })

    // State for Master Sheet dropdown
    const [masterSheetOptions, setMasterSheetOptions] = useState<string[]>([])
    const [selectedMasterOption, setSelectedMasterOption] = useState("")
    const [isFetchingMaster, setIsFetchingMaster] = useState(false)

    // State for department data
    const [departmentData, setDepartmentData] = useState<{
        allTasks: Task[];
        staffMembers: any[];
        totalTasks: number;
        completedTasks: number;
        pendingTasks: number;
        overdueTasks: number;
        activeStaff: number;
        completionRate: number | string;
        barChartData: any[];
        pieChartData: any[];
    }>({
        allTasks: [],
        staffMembers: [],
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        activeStaff: 0,
        completionRate: 0,
        barChartData: [],
        pieChartData: []
    })

    // Store the current date for overdue calculation
    const [currentDate, setCurrentDate] = useState(new Date())

    // Format date as DD/MM/YYYY
    // Format date as DD/MM/YYYY
    const formatDateToDDMMYYYY = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
    }

    // Parse DD/MM/YYYY to Date object
    // Parse DD/MM/YYYY to Date object
    const parseDateFromDDMMYYYY = (dateStr: string) => {
        if (!dateStr || typeof dateStr !== 'string') return null
        const parts = dateStr.split('/')
        if (parts.length !== 3) return null
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
    }

    // New state for date range filtering
    const [dateRange, setDateRange] = useState({
        startDate: "",
        endDate: "",
        filtered: false
    });

    const [misSelectedStaff, setMisSelectedStaff] = useState("all");

    // Memoized stats for MIS Report
    const misStats = useMemo(() => {
        let tasks = departmentData.allTasks;

        // 1. Filter by Staff
        if (misSelectedStaff !== "all") {
            tasks = tasks.filter(t => t.assignedTo === misSelectedStaff);
        }

        // 2. Filter by Date (only if dateRange.filtered is true)
        if (dateRange.filtered && dateRange.startDate && dateRange.endDate) {
            const startDate = new Date(dateRange.startDate);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(dateRange.endDate);
            endDate.setHours(23, 59, 59, 999);

            tasks = tasks.filter(task => {
                const dueDate = parseDateFromDDMMYYYY(task.dueDate);
                if (!dueDate) return false;
                return dueDate >= startDate && dueDate <= endDate;
            });
        }

        // Calculate Stats
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const pendingTasks = tasks.filter(t => t.status === 'pending').length;
        const overdueTasks = tasks.filter(t => t.status === 'overdue').length;
        const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

        return {
            totalTasks,
            completedTasks,
            pendingTasks,
            overdueTasks,
            completionRate
        };
    }, [departmentData.allTasks, misSelectedStaff, dateRange.filtered, dateRange.startDate, dateRange.endDate]);

    // Memoized data for Overview Charts
    const { overviewChartData, overviewPieData } = useMemo(() => {
        let barData = [];
        const pieCounts = { Completed: 0, Pending: 0, Overdue: 0 };

        if (overviewMonth === -1) {
            // Yearly View: 12 Months
            for (let i = 0; i < 12; i++) {
                const monthName = new Date(0, i).toLocaleString('default', { month: 'short' });
                barData.push({ name: monthName, completed: 0, pending: 0, overdue: 0 });
            }

            departmentData.allTasks.forEach(task => {
                const dueDate = parseDateFromDDMMYYYY(task.dueDate);
                const completeDate = task.actual ? new Date(task.actual) : null;

                // For Chart Distribution (Bar Chart)
                // Logic: Count Pending/Overdue in Due Month. Count Completed in Actual Month (or Due Month if actual missing).
                // Filter by Overview Year.

                if (task.status === 'completed') {
                    const targetDate = completeDate || dueDate;
                    if (targetDate && (overviewYear === -1 || targetDate.getFullYear() === overviewYear)) {
                        barData[targetDate.getMonth()].completed++;
                        pieCounts.Completed++;
                    }
                } else {
                    // Pending or Overdue
                    if (dueDate && (overviewYear === -1 || dueDate.getFullYear() === overviewYear)) {
                        if (task.status === 'overdue') {
                            barData[dueDate.getMonth()].overdue++;
                            pieCounts.Overdue++;
                        } else {
                            barData[dueDate.getMonth()].pending++;
                            pieCounts.Pending++;
                        }
                    }
                }
            });
        } else {
            // Monthly View: Daily Breakdown
            // If All Years selected (-1), use a leap year (e.g. 2024) to ensure max days (29 for Feb) are covered
            const yearForDays = overviewYear === -1 ? 2024 : overviewYear;
            const daysInMonth = new Date(yearForDays, overviewMonth + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                barData.push({ name: `${i}`, completed: 0, pending: 0, overdue: 0 });
            }

            departmentData.allTasks.forEach(task => {
                const dueDate = parseDateFromDDMMYYYY(task.dueDate);
                const completeDate = task.actual ? new Date(task.actual) : null;

                if (task.status === 'completed') {
                    const targetDate = completeDate || dueDate;
                    if (targetDate && (overviewYear === -1 || targetDate.getFullYear() === overviewYear) && targetDate.getMonth() === overviewMonth) {
                        const day = targetDate.getDate();
                        if (barData[day - 1]) {
                            barData[day - 1].completed++;
                            pieCounts.Completed++;
                        }
                    }
                } else {
                    if (dueDate && (overviewYear === -1 || dueDate.getFullYear() === overviewYear) && dueDate.getMonth() === overviewMonth) {
                        const day = dueDate.getDate();
                        if (barData[day - 1]) {
                            if (task.status === 'overdue') {
                                barData[day - 1].overdue++;
                                pieCounts.Overdue++;
                            } else {
                                barData[day - 1].pending++;
                                pieCounts.Pending++;
                            }
                        }
                    }
                }
            });
        }

        const pieData = [
            { name: "Completed", value: pieCounts.Completed, color: "#22c55e" },
            { name: "Pending", value: pieCounts.Pending, color: "#facc15" },
            { name: "Overdue", value: pieCounts.Overdue, color: "#ef4444" }
        ];

        return { overviewChartData: barData, overviewPieData: pieData };
    }, [departmentData.allTasks, overviewYear, overviewMonth]);

    // Helper function to format date from ISO format to DD/MM/YYYY
    const formatLocalDate = (isoDate: string) => {
        if (!isoDate) return "";
        const date = new Date(isoDate);
        return formatDateToDDMMYYYY(date);
    };

    // Function to filter tasks by date range
    const filterTasksByDateRange = () => {
        // Validate dates
        if (!dateRange.startDate || !dateRange.endDate) {
            alert("Please select both start and end dates");
            return;
        }

        const startDate = new Date(dateRange.startDate);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);

        if (startDate > endDate) {
            alert("Start date must be before end date");
            return;
        }






        // Set filtered flag to true
        setDateRange(prev => ({ ...prev, filtered: true }));
    };

    // Function to generate PDF report
    const generatePDFReport = () => {
        // Validation: If not filtered or dates invalid, try to validate dates
        if (!dateRange.startDate || !dateRange.endDate) {
            alert("Please select both start and end dates");
            return;
        }

        // Ensure filtered mode is On (for consistency in UI if user didn't click apply)
        if (!dateRange.filtered) {
            setDateRange(prev => ({ ...prev, filtered: true }));
        }

        const doc = new jsPDF();

        // --- Prepare Data Locally ---
        // We filter data locally to ensure the PDF reflects exactly the requested range/staff
        // regardless of render cycle state.
        let tasks = departmentData.allTasks;

        // 1. Filter by Staff
        if (misSelectedStaff !== "all") {
            tasks = tasks.filter(t => t.assignedTo === misSelectedStaff);
        }

        // 2. Filter by Date
        const sDate = new Date(dateRange.startDate);
        sDate.setHours(0, 0, 0, 0);
        const eDate = new Date(dateRange.endDate);
        eDate.setHours(23, 59, 59, 999);

        tasks = tasks.filter(task => {
            const dueDate = parseDateFromDDMMYYYY(task.dueDate);
            if (!dueDate) return false;
            return dueDate >= sDate && dueDate <= eDate;
        });

        // 3. Compute Stats
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        const pending = tasks.filter(t => t.status === 'pending').length;
        const overdue = tasks.filter(t => t.status === 'overdue').length;

        // --- Header Section ---
        doc.setFillColor(153, 27, 27); // #991B1B
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("MIS Performance Report", 14, 25);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const reportDate = new Date().toLocaleDateString();
        doc.text(`Generated on: ${reportDate}`, 150, 25);

        // --- Filter Stats Section ---
        let currentY = 50;
        doc.setTextColor(50, 50, 50);

        // Context Info
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Report Details:", 14, currentY);

        currentY += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Department: ${selectedMasterOption}`, 14, currentY);
        doc.text(`Staff Member: ${misSelectedStaff}`, 14, currentY + 6);
        doc.text(`Period: ${formatLocalDate(dateRange.startDate)} to ${formatLocalDate(dateRange.endDate)}`, 14, currentY + 12);

        // Summary Cards
        const summaryY = currentY + 20;
        const boxWidth = 45;
        const boxHeight = 25;
        const gap = 5;

        // Card 1: Total
        doc.setFillColor(239, 246, 255); // Blue-50
        doc.setDrawColor(191, 219, 254); // Blue-200
        doc.roundedRect(14, summaryY, boxWidth, boxHeight, 3, 3, 'FD');
        doc.setTextColor(30, 58, 138); // Blue-900
        doc.setFontSize(9);
        doc.text("Total Tasks", 19, summaryY + 8);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(total.toString(), 19, summaryY + 18);

        // Card 2: Completed
        doc.setFillColor(240, 253, 244); // Green-50
        doc.setDrawColor(187, 247, 208); // Green-200
        doc.roundedRect(14 + boxWidth + gap, summaryY, boxWidth, boxHeight, 3, 3, 'FD');
        doc.setTextColor(20, 83, 45); // Green-900
        doc.setFontSize(9);
        doc.text("Completed", 19 + boxWidth + gap, summaryY + 8);
        doc.setFontSize(16);
        doc.text(completed.toString(), 19 + boxWidth + gap, summaryY + 18);

        // Card 3: Pending
        doc.setFillColor(255, 251, 235); // Amber-50
        doc.setDrawColor(253, 230, 138); // Amber-200
        doc.roundedRect(14 + (boxWidth + gap) * 2, summaryY, boxWidth, boxHeight, 3, 3, 'FD');
        doc.setTextColor(120, 53, 15); // Amber-900
        doc.setFontSize(9);
        doc.text("Pending", 19 + (boxWidth + gap) * 2, summaryY + 8);
        doc.setFontSize(16);
        doc.text(pending.toString(), 19 + (boxWidth + gap) * 2, summaryY + 18);

        // Card 4: Overdue
        doc.setFillColor(254, 242, 242); // Red-50
        doc.setDrawColor(254, 202, 202); // Red-200
        doc.roundedRect(14 + (boxWidth + gap) * 3, summaryY, boxWidth, boxHeight, 3, 3, 'FD');
        doc.setTextColor(127, 29, 29); // Red-900
        doc.setFontSize(9);
        doc.text("Overdue", 19 + (boxWidth + gap) * 3, summaryY + 8);
        doc.setFontSize(16);
        doc.text(overdue.toString(), 19 + (boxWidth + gap) * 3, summaryY + 18);

        currentY = summaryY + boxHeight + 15;

        // --- Table Section ---
        const tableColumn = ["Task ID", "Title", "Assigned To", "Due Date", "Frequency", "Status"];
        const tableRows = tasks.map(task => [
            task.id,
            task.title,
            task.assignedTo,
            task.dueDate,
            task.frequency,
            task.status.toUpperCase()
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: currentY,
            theme: 'grid',
            headStyles: {
                fillColor: [153, 27, 27], // #991B1B
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold',
                halign: 'left'
            },
            bodyStyles: {
                fontSize: 9,
                textColor: [50, 50, 50]
            },
            alternateRowStyles: {
                fillColor: [249, 250, 251] // Gray-50
            },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 'auto' }, // Title gets remaining space
                2: { cellWidth: 30 },
                3: { cellWidth: 25 },
                4: { cellWidth: 25 },
                5: { cellWidth: 25, fontStyle: 'bold' }
            },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 5) {
                    const status = data.cell.raw;
                    if (status === 'COMPLETED') {
                        data.cell.styles.textColor = [22, 163, 74]; // Green
                    } else if (status === 'PENDING') {
                        data.cell.styles.textColor = [217, 119, 6]; // Amber
                    } else if (status === 'OVERDUE') {
                        data.cell.styles.textColor = [220, 38, 38]; // Red
                    }
                }
            }
        });

        // Save
        const fileName = `MIS_Report_${selectedMasterOption}_${misSelectedStaff}_${dateRange.startDate}.pdf`;
        doc.save(fileName);
    };



    // Function to check if a date is in the past
    const isDateInPast = (dateStr: string) => {
        const date = parseDateFromDDMMYYYY(dateStr)
        if (!date) return false
        return date < currentDate
    }

    // Function to fetch departments from Supabase
    const fetchDepartments = async () => {
        try {
            setIsFetchingMaster(true)

            // Run requests in parallel
            const [deptResult, staffCountResult] = await Promise.all([
                supabase
                    .from('departments')
                    .select('dept_name')
                    .order('dept_name'),
                supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'active')
            ]);

            if (deptResult.error) throw deptResult.error

            const options = ["Select Department", ...deptResult.data.map(d => d.dept_name)]
            setMasterSheetOptions(options)

            if (!selectedMasterOption) {
                setSelectedMasterOption(options[0])
            }

            if (!staffCountResult.error) {
                setDepartmentData(prev => ({
                    ...prev,
                    activeStaff: staffCountResult.count || 0
                }))
            }

        } catch (error) {
            console.error("Error fetching departments:", error)
            setMasterSheetOptions(["Error loading departments"])
        } finally {
            setIsFetchingMaster(false)
        }
    }

    // Function to fetch department data from Supabase
    const fetchDepartmentData = async (department: string) => {
        if (!department || department === "Select Department") {
            return;
        }

        try {
            setIsFetchingMaster(true);
            const username = sessionStorage.getItem('username');
            const userRole = sessionStorage.getItem('role');

            const BATCH_SIZE = 1000;

            // Helper to fetch all data in parallel chunks
            const fetchAllData = async (
                table: string,
                queryCustomizer: (query: any) => any
            ) => {
                // Initial fetch to get the count and the first page
                let query = supabase.from(table).select('*', { count: 'exact' });
                query = queryCustomizer(query);

                const { data, count, error } = await query.range(0, BATCH_SIZE - 1);

                if (error) throw error;

                let allData = data || [];
                const totalCount = count || 0;

                if (totalCount > BATCH_SIZE) {
                    const promises = [];
                    for (let from = BATCH_SIZE; from < totalCount; from += BATCH_SIZE) {
                        const to = from + BATCH_SIZE - 1;
                        let pageQuery = supabase.from(table).select('*');
                        pageQuery = queryCustomizer(pageQuery);
                        promises.push(pageQuery.range(from, to));
                    }

                    const responses = await Promise.all(promises);
                    responses.forEach(res => {
                        if (res.error) throw res.error;
                        if (res.data) allData = [...allData, ...res.data];
                    });
                }

                return allData;
            };

            // Run tasks and users fetch in parallel
            const [tasksData, usersData] = await Promise.all([
                fetchAllData('master_tasks', (q) => q.eq('department', department)),
                fetchAllData('users', (q) => q.eq('department', department))
            ]);

            let totalTasks = 0;
            let completedTasks = 0;
            let pendingTasks = 0;
            let overdueTasks = 0;

            const monthlyData: Record<string, { completed: number; pending: number }> = {
                Jan: { completed: 0, pending: 0 },
                Feb: { completed: 0, pending: 0 },
                Mar: { completed: 0, pending: 0 },
                Apr: { completed: 0, pending: 0 },
                May: { completed: 0, pending: 0 },
                Jun: { completed: 0, pending: 0 },
                Jul: { completed: 0, pending: 0 },
                Aug: { completed: 0, pending: 0 },
                Sep: { completed: 0, pending: 0 },
                Oct: { completed: 0, pending: 0 },
                Nov: { completed: 0, pending: 0 },
                Dec: { completed: 0, pending: 0 }
            };

            const statusData = {
                Completed: 0,
                Pending: 0,
                Overdue: 0
            };

            // Process users into a map for stats
            const staffTrackingMap = new Map();
            // Initialize with all users in department
            usersData?.forEach(user => {
                staffTrackingMap.set(user.full_name, {
                    name: user.full_name,
                    role: user.role,
                    totalTasks: 0,
                    completedTasks: 0,
                    pendingTasks: 0,
                    progress: 0
                });
            });

            const processedTasks = tasksData.map((row) => {
                const assignedTo = row.name || 'Unassigned';

                // Initialize staff in map if not present (e.g. if name in task doesn't match user table exactly)
                if (!staffTrackingMap.has(assignedTo)) {
                    staffTrackingMap.set(assignedTo, {
                        name: assignedTo,
                        role: 'User',
                        totalTasks: 0,
                        completedTasks: 0,
                        pendingTasks: 0,
                        progress: 0
                    });
                }

                const taskDate = row.task_start_date ? new Date(row.task_start_date) : null;
                const completedDate = row.actual ? new Date(row.actual) : null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const isCompleted = row.status === 'Yes';

                // Determine derived status
                let derivedStatus = 'pending';
                if (isCompleted) {
                    derivedStatus = 'completed';
                } else if (taskDate && taskDate < today) {
                    derivedStatus = 'overdue';
                } else {
                    derivedStatus = 'pending';
                }

                // Populate stats
                totalTasks++;
                const staffData = staffTrackingMap.get(assignedTo);
                staffData.totalTasks++;

                if (isCompleted) {
                    completedTasks++;
                    statusData.Completed++;
                    staffData.completedTasks++;

                    // Monthly stats - use actual completion date
                    if (completedDate) {
                        const monthName = completedDate.toLocaleString('default', { month: 'short' });
                        if (monthlyData[monthName]) {
                            monthlyData[monthName].completed++;
                        }
                    } else if (taskDate) {
                        // Fallback to task date if actual missing but status is Yes
                        const monthName = taskDate.toLocaleString('default', { month: 'short' });
                        if (monthlyData[monthName]) monthlyData[monthName].completed++;
                    }

                } else {
                    // Pending or Overdue
                    staffData.pendingTasks++;

                    if (derivedStatus === 'overdue') {
                        overdueTasks++;
                        statusData.Overdue++;
                    } else {
                        pendingTasks++;
                        statusData.Pending++;
                    }

                    // Monthly stats - use task planned date
                    if (taskDate) {
                        const monthName = taskDate.toLocaleString('default', { month: 'short' });
                        if (monthlyData[monthName]) {
                            monthlyData[monthName].pending++;
                        }
                    }
                }

                // Return mapped Task object
                return {
                    ...row,
                    id: row.task_id,
                    title: row.task_title || 'Untitled Task',
                    assignedTo: assignedTo,
                    dueDate: row.task_start_date ? formatDateToDDMMYYYY(new Date(row.task_start_date)) : '',
                    status: derivedStatus,
                    frequency: row.freq || 'one-time'
                };
            });

            const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

            const barChartData = Object.entries(monthlyData).map(([name, data]) => ({
                name,
                completed: data.completed,
                pending: data.pending
            }));

            const pieChartData = [
                { name: "Completed", value: statusData.Completed, color: "#22c55e" },
                { name: "Pending", value: statusData.Pending, color: "#facc15" },
                { name: "Overdue", value: statusData.Overdue, color: "#ef4444" }
            ];

            const staffMembers = Array.from(staffTrackingMap.values()).map(staff => {
                const progress = staff.totalTasks > 0
                    ? Math.round((staff.completedTasks / staff.totalTasks) * 100)
                    : 0;

                return {
                    id: staff.name.replace(/\s+/g, '-').toLowerCase(),
                    name: staff.name,
                    role: staff.role,
                    email: `${staff.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
                    totalTasks: staff.totalTasks,
                    completedTasks: staff.completedTasks,
                    pendingTasks: staff.pendingTasks,
                    progress
                };
            }).filter(s => s.totalTasks > 0); // Only show staff with tasks? Or all? Let's show active ones.

            setDepartmentData({
                allTasks: processedTasks,
                staffMembers,
                totalTasks,
                completedTasks,
                pendingTasks,
                overdueTasks,
                activeStaff: staffMembers.length,
                completionRate,
                barChartData,
                pieChartData
            });

        } catch (error) {
            console.error(`Error fetching ${department} data:`, error);
        } finally {
            setIsFetchingMaster(false);
        }
    };

    useEffect(() => {
        if (selectedMasterOption && selectedMasterOption !== "Select Department") {
            fetchDepartmentData(selectedMasterOption);
        }
    }, [selectedMasterOption]);

    useEffect(() => {
        setVisibleTasksCount(10);
    }, [taskView, filterStatus, filterStaff, searchQuery, filterDate]);

    useEffect(() => {
        setCurrentDate(new Date());
        fetchDepartments();
    }, []);

    const filteredTasks = departmentData.allTasks.filter((task) => {
        if (filterStatus !== "all" && task.status !== filterStatus) return false;
        if (filterStaff !== "all" && task.assignedTo !== filterStaff) return false;

        if (searchQuery && searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase().trim();
            if (typeof task.title === 'string' && task.title.toLowerCase().includes(query)) {
                return true;
            }
            if ((typeof task.id === 'string' && task.id.toLowerCase().includes(query)) ||
                (typeof task.id === 'number' && task.id.toString().includes(query))) {
                return true;
            }
            if (typeof task.assignedTo === 'string' && task.assignedTo.toLowerCase().includes(query)) {
                return true;
            }
            return false;
        }
        return true;
    });

    const getTasksByView = (view: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(today.getDate() + 3);

        const viewFilteredTasks = filteredTasks.filter((task) => {
            if (!task.status || task.status === "completed") return false;
            const dueDate = parseDateFromDDMMYYYY(task.dueDate);
            if (!dueDate) return false;

            // If a specific date is selected for filtering, override the view logic
            if (filterDate) {
                const selectedDate = new Date(filterDate);
                // Reset time to start of day for accurate comparison
                selectedDate.setHours(0, 0, 0, 0);

                return (
                    dueDate.getDate() === selectedDate.getDate() &&
                    dueDate.getMonth() === selectedDate.getMonth() &&
                    dueDate.getFullYear() === selectedDate.getFullYear()
                );
            }

            switch (view) {
                case "recent":
                    // Show today and upcoming 3 days tasks
                    return dueDate >= today && dueDate <= threeDaysFromNow;
                case "upcoming":
                    return dueDate > today;
                case "overdue":
                    return dueDate < today;
                default:
                    return true;
            }
        });

        // Sort upcoming tasks in ascending order by Date
        if (view === "upcoming") {
            viewFilteredTasks.sort((a, b) => {
                const dateA = parseDateFromDDMMYYYY(a.dueDate);
                const dateB = parseDateFromDDMMYYYY(b.dueDate);
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateA.getTime() - dateB.getTime();
            });
        }

        return viewFilteredTasks;
    };

    const handleTabChange = (view: string) => {
        setTaskView(view);
        setFilterDate(""); // Clear date filter when switching tabs
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "bg-green-500 text-white"
            case "pending": return "bg-amber-500 text-white"
            case "overdue": return "bg-red-500 text-white"
            default: return "bg-gray-500 text-white"
        }
    }

    const getFrequencyColor = (frequency: string) => {
        switch (frequency) {
            case "one-time": return "bg-gray-100 text-gray-700"
            case "daily": return "bg-blue-50 text-blue-700"
            case "weekly": return "bg-purple-50 text-purple-700"
            case "fortnightly": return "bg-indigo-50 text-indigo-700"
            case "monthly": return "bg-orange-50 text-orange-700"
            case "quarterly": return "bg-amber-50 text-amber-700"
            case "yearly": return "bg-emerald-50 text-emerald-700"
            default: return "bg-gray-100 text-gray-700"
        }
    }

    const TasksOverviewChart = () => (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={overviewChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                    dataKey="name"
                    fontSize={10}
                    stroke="#9ca3af"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                />
                <YAxis fontSize={12} stroke="#9ca3af" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip cursor={{ fill: '#FEF2F2' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} barSize={20} />
                <Bar dataKey="pending" name="Pending" stackId="a" fill="#facc15" radius={[0, 0, 0, 0]} barSize={20} />
                <Bar dataKey="overdue" name="Overdue" stackId="a" fill="#991B1B" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
        </ResponsiveContainer>
    )

    const TasksCompletionChart = () => (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie data={overviewPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                    {overviewPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    )

    const StaffTasksTable = () => {
        const filteredStaffMembers = departmentData.staffMembers.map(staff => {
            const staffTasks = departmentData.allTasks.filter(task => task.assignedTo === staff.name);

            // Filter tasks by selected Month and Year
            const filteredTasks = staffTasks.filter(task => {
                const dueDate = parseDateFromDDMMYYYY(task.dueDate);
                const actualDate = task.actual ? new Date(task.actual) : null;

                const isDueInMonth = dueDate &&
                    (performanceMonth === -1 || dueDate.getMonth() === performanceMonth) &&
                    (performanceYear === -1 || dueDate.getFullYear() === performanceYear);

                const isCompletedInMonth = actualDate &&
                    (performanceMonth === -1 || actualDate.getMonth() === performanceMonth) &&
                    (performanceYear === -1 || actualDate.getFullYear() === performanceYear);

                // Include task if it was due in the selected month OR if it was completed in the selected month
                // This ensures work done is credited to the month it was done, and work planned is tracked in the month matches
                return isDueInMonth || (task.status === 'completed' && isCompletedInMonth);
            });

            const totalTasks = filteredTasks.length;
            const completedTasks = filteredTasks.filter(task => task.status === 'completed').length;
            const overdueTasks = filteredTasks.filter(task => task.status === 'overdue').length;
            const pendingTasks = filteredTasks.filter(task => task.status === 'pending').length; // or total - completed
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return { ...staff, totalTasks, completedTasks, pendingTasks, overdueTasks, progress };
        });

        // Filter out staff with 0 tasks in the selected period if desired, or keep them to show "0"
        // Let's keep them to show availability/workload. 
        // Although the previous code filtered out staff with 0 tasks.
        // Let's only keep those who have tasks OR satisfy the dashboard filter if any. 
        // Actually, let's show all staff in the department so we see who has 0 work.

        return (
            <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Tasks</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredStaffMembers.map((staff) => (
                                <tr key={staff.id} className="hover:bg-gray-50/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-[#FEF2F2] text-[#991B1B] flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-sm">
                                                {staff.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900">{staff.name}</div>
                                                <div className="text-xs text-gray-500">{staff.role || "Staff Member"}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{staff.totalTasks}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-green-600 font-medium">{staff.completedTasks}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-red-600 font-medium">{staff.pendingTasks + staff.overdueTasks}</div>
                                    </td>
                                    <td className="px-6 py-4 w-48">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${staff.progress >= 70 ? 'bg-green-500' : staff.progress >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                    style={{ width: `${staff.progress}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-gray-600 w-8">{staff.progress}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-gray-100">
                    {filteredStaffMembers.map((staff) => (
                        <div key={staff.id} className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-[#FEF2F2] text-[#991B1B] flex items-center justify-center font-bold text-sm ring-2 ring-white shadow-sm">
                                        {staff.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">{staff.name}</div>
                                        <div className="text-xs text-gray-500">{staff.role || "Staff Member"}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${staff.progress >= 70 ? 'bg-green-50 text-green-700' : staff.progress >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                                        {staff.progress}%
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="p-2 bg-gray-50 rounded-lg text-center">
                                    <div className="text-xs text-gray-500 mb-1">Total</div>
                                    <div className="text-sm font-bold text-gray-900">{staff.totalTasks}</div>
                                </div>
                                <div className="p-2 bg-green-50 rounded-lg text-center">
                                    <div className="text-xs text-green-600/80 mb-1">Done</div>
                                    <div className="text-sm font-bold text-green-700">{staff.completedTasks}</div>
                                </div>
                                <div className="p-2 bg-red-50 rounded-lg text-center">
                                    <div className="text-xs text-red-600/80 mb-1">Pending</div>
                                    <div className="text-sm font-bold text-red-700">{staff.pendingTasks + staff.overdueTasks}</div>
                                </div>
                            </div>

                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${staff.progress >= 70 ? 'bg-green-500' : staff.progress >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${staff.progress}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-gray-100 pb-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Admin Dashboard</h1>
                        <p className="text-sm text-gray-500">Manage tasks, departments and reports.</p>
                    </div>
                    <div>
                        <select
                            value={selectedMasterOption}
                            onChange={(e) => setSelectedMasterOption(e.target.value)}
                            className="w-[200px] rounded-lg border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-all hover:border-[#991B1B] focus:border-[#991B1B] focus:outline-none focus:ring-1 focus:ring-[#991B1B] disabled:opacity-50"
                            disabled={isFetchingMaster}
                        >
                            {isFetchingMaster ? (
                                <option>Loading...</option>
                            ) : (
                                masterSheetOptions.map((option, index) => (
                                    <option key={index} value={option}>{option}</option>
                                ))
                            )}
                        </select>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Tasks"
                        value={departmentData.totalTasks}
                        description={selectedMasterOption !== "Select Department" ? `in ${selectedMasterOption}` : "Select department"}
                        icon={<ListTodo />}
                        accentColor="blue"
                        onClick={() => setStatModal({ isOpen: true, type: 'all', title: 'Total Tasks' })}
                    />
                    <StatCard
                        title="Completed"
                        value={departmentData.completedTasks}
                        description="Total completed"
                        icon={<CheckCircle2 />}
                        accentColor="green"
                        onClick={() => setStatModal({ isOpen: true, type: 'completed', title: 'Completed Tasks' })}
                    />
                    <StatCard
                        title="Pending"
                        value={departmentData.pendingTasks}
                        description="Awaiting completion"
                        icon={<Clock />}
                        accentColor="amber"
                        onClick={() => setStatModal({ isOpen: true, type: 'pending', title: 'Pending Tasks' })}
                    />
                    <StatCard
                        title="Overdue"
                        value={departmentData.overdueTasks}
                        description="Requires attention"
                        icon={<AlertTriangle />}
                        accentColor="red"
                        alert={true}
                        onClick={() => setStatModal({ isOpen: true, type: 'overdue', title: 'Overdue Tasks' })}
                    />
                </div>

                {/* Task Navigation and List */}
                <div className="space-y-8">
                    <div className="space-y-6">
                        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                            <div className="bg-[#FEF2F2]/30 p-1 border-b border-gray-100">
                                <div className="grid grid-cols-3 gap-1">
                                    <ViewTabButton active={taskView === "recent"} onClick={() => handleTabChange("recent")} label="Recent" />
                                    <ViewTabButton active={taskView === "upcoming"} onClick={() => handleTabChange("upcoming")} label="Upcoming" />
                                    <ViewTabButton active={taskView === "overdue"} onClick={() => handleTabChange("overdue")} label="Overdue" />
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="flex flex-col gap-4 md:flex-row mb-6">
                                    <div className="relative flex-1">
                                        <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <input
                                            placeholder="Search tasks..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full rounded-lg border-gray-200 bg-gray-50 pl-9 pr-4 py-2 text-sm focus:border-[#991B1B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#991B1B] transition-all"
                                        />
                                    </div>
                                    <input
                                        type="date"
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        className="w-full md:w-[150px] rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:border-[#991B1B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#991B1B] transition-all"
                                    />
                                    <select
                                        value={filterStaff}
                                        onChange={(e) => setFilterStaff(e.target.value)}
                                        className="w-full md:w-[180px] rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:border-[#991B1B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#991B1B] transition-all"
                                    >
                                        <option value="all">All Staff</option>
                                        {departmentData.staffMembers.map((staff) => (
                                            <option key={staff.id} value={staff.name}>{staff.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="h-[400px] overflow-y-auto custom-scrollbar border border-gray-100 rounded-lg bg-white">
                                    {/* Desktop Table View */}
                                    <div className="hidden md:block">
                                        <table className="min-w-full divide-y divide-gray-100">
                                            <thead className="bg-[#FEF2F2] sticky top-0 z-10">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-[#991B1B] uppercase tracking-wider">Task Title</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-[#991B1B] uppercase tracking-wider">Assigned To</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-[#991B1B] uppercase tracking-wider">Due Date</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-[#991B1B] uppercase tracking-wider">Frequency</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-100">
                                                {getTasksByView(taskView).length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                            <div className="flex flex-col items-center justify-center">
                                                                <div className="rounded-full bg-gray-50 p-4 mb-3">
                                                                    <ListTodo className="h-6 w-6 text-gray-400" />
                                                                </div>
                                                                <p>No tasks found matching your filters.</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    getTasksByView(taskView).slice(0, visibleTasksCount).map((task) => (
                                                        <tr key={task.id} className="hover:bg-[#FEF2F2]/30 transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <div className="text-sm font-medium text-gray-900 group-hover:text-[#991B1B] transition-colors truncate max-w-[200px]" title={task.title}>
                                                                    {task.title}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                    <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                                    <span className="break-words">{task.assignedTo}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                    <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                                    {task.dueDate}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-left ${getFrequencyColor(task.frequency)}`}>
                                                                    {task.frequency}
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
                                        {getTasksByView(taskView).length === 0 ? (
                                            <div className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="rounded-full bg-gray-50 p-4 mb-3">
                                                        <ListTodo className="h-6 w-6 text-gray-400" />
                                                    </div>
                                                    <p>No tasks found matching your filters.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                {getTasksByView(taskView).slice(0, visibleTasksCount).map((task) => (
                                                    <div key={task.id} className="p-4 space-y-3 hover:bg-[#FEF2F2]/30 transition-colors">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="text-sm font-medium text-gray-900 line-clamp-2" title={task.title}>
                                                                {task.title}
                                                            </div>
                                                            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getFrequencyColor(task.frequency)}`}>
                                                                {task.frequency}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                                            <div className="flex items-center gap-1.5">
                                                                <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                                <span className="truncate max-w-[120px]">{task.assignedTo}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                                {task.dueDate}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {getTasksByView(taskView).length > 0 && (
                                    <div className="mt-4 flex flex-col items-center justify-center gap-2 min-h-[60px]">
                                        <p className="text-xs text-gray-500">
                                            Showing {Math.min(visibleTasksCount, getTasksByView(taskView).length)} of {getTasksByView(taskView).length} tasks
                                        </p>
                                        <div className="h-8 flex items-center">
                                            {visibleTasksCount < getTasksByView(taskView).length ? (
                                                <button
                                                    onClick={() => setVisibleTasksCount(prev => prev + 10)}
                                                    className="flex items-center gap-1 text-xs font-medium text-[#991B1B] hover:text-[#7f1616] transition-colors bg-[#FEF2F2] hover:bg-[#FEE2E2] px-3 py-1.5 rounded-full"
                                                >
                                                    Load More
                                                    <ChevronDown className="h-3 w-3" />
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400 font-medium">All tasks loaded</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="group rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Active Staff</h3>
                                    <div className="mt-1 flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-gray-900">{departmentData.activeStaff}</span>
                                        <span className="text-xs text-gray-400">Total Members</span>
                                    </div>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-[#FEF2F2] flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                    <Users className="h-6 w-6 text-[#991B1B]" />
                                </div>
                            </div>
                        </div>

                        <div className="group rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${parseFloat(departmentData.completionRate.toString()) >= 70 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                            {parseFloat(departmentData.completionRate.toString()) >= 70 ? 'On Track' : 'Focus Needed'}
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-2xl font-bold text-gray-900">{departmentData.completionRate}%</span>
                                        <span className="text-xs text-gray-400">
                                            ({departmentData.completedTasks}/{departmentData.totalTasks} Done)
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#991B1B] rounded-full transition-all duration-1000"
                                            style={{ width: `${departmentData.completionRate}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-[#FEF2F2] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                                    <CheckCircle2 className="h-6 w-6 text-[#991B1B]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Tabs and Report */}
                <div className="space-y-6">
                    <div>
                        <div className="inline-flex items-center p-1 rounded-xl bg-gray-100/80 border border-gray-200">
                            <BottomTab active={activeTab === "overview"} onClick={() => setActiveTab("overview")} label="Overview" icon={<LayoutDashboard className="h-4 w-4" />} />
                            <BottomTab active={activeTab === "mis"} onClick={() => setActiveTab("mis")} label="MIS Report" icon={<FileBarChart className="h-4 w-4" />} />
                            <BottomTab active={activeTab === "staff"} onClick={() => setActiveTab("staff")} label="Staff Performance" icon={<UserCheck className="h-4 w-4" />} />
                        </div>
                    </div>

                    <div className="min-h-[400px]">
                        {activeTab === "overview" && (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="lg:col-span-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-900">Task Overview</h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {overviewMonth === -1
                                                    ? `Monthly completion for ${overviewYear}`
                                                    : `Daily completion for ${new Date(0, overviewMonth).toLocaleString('default', { month: 'long' })} ${overviewYear}`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={overviewMonth}
                                                onChange={(e) => setOverviewMonth(parseInt(e.target.value))}
                                                className="rounded-lg border-gray-200 bg-gray-50 text-sm py-1.5 focus:border-[#991B1B] focus:ring-[#991B1B]"
                                            >
                                                <option value={-1}>All Months</option>
                                                {Array.from({ length: 12 }, (_, i) => (
                                                    <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={overviewYear}
                                                onChange={(e) => setOverviewYear(parseInt(e.target.value))}
                                                className="rounded-lg border-gray-200 bg-gray-50 text-sm py-1.5 focus:border-[#991B1B] focus:ring-[#991B1B]"
                                            >
                                                <option value={-1}>All Years</option>
                                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                                    <option key={year} value={year}>{year}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <TasksOverviewChart />
                                </div>
                                <div className="lg:col-span-3 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                                    <div className="mb-6 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-900">Status Distribution</h3>
                                            <p className="text-xs text-gray-500 mt-1">Current status of all tasks</p>
                                        </div>
                                        <div className="p-2 bg-gray-50 rounded-lg">
                                            <FileBarChart className="h-4 w-4 text-gray-400" />
                                        </div>
                                    </div>
                                    <TasksCompletionChart />
                                </div>


                            </div>
                        )}

                        {activeTab === "mis" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                                    <div className="mb-8 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-900">MIS Report Generator</h3>
                                            <p className="text-xs text-gray-500 mt-1">Select date range to filter performance metrics</p>
                                        </div>
                                        <div className="p-2 bg-gray-50 rounded-lg">
                                            <Filter className="h-4 w-4 text-gray-400" />
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-4 items-end mb-8">
                                        <div className="space-y-1.5 flex-1 w-full">
                                            <label className="text-xs font-medium text-gray-500">Staff Member</label>
                                            <div className="relative">
                                                <select
                                                    value={misSelectedStaff}
                                                    onChange={(e) => setMisSelectedStaff(e.target.value)}
                                                    className="w-full rounded-lg border-gray-200 bg-gray-50/50 pl-4 pr-4 py-2 text-sm focus:border-[#991B1B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#991B1B] transition-all"
                                                >
                                                    <option value="all">All Staff</option>
                                                    {departmentData.staffMembers.map((staff) => (
                                                        <option key={staff.id} value={staff.name}>{staff.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 flex-1 w-full">
                                            <label className="text-xs font-medium text-gray-500">Start Date</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    value={dateRange.startDate}
                                                    max={dateRange.endDate}
                                                    onChange={(e) => {
                                                        const newStartDate = e.target.value;
                                                        if (dateRange.endDate && newStartDate > dateRange.endDate) {
                                                            alert("Start date cannot be later than end date");
                                                            return;
                                                        }
                                                        setDateRange(prev => ({ ...prev, startDate: newStartDate }));
                                                    }}
                                                    className="w-full rounded-lg border-gray-200 bg-gray-50/50 pl-4 pr-4 py-2 text-sm focus:border-[#991B1B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#991B1B] transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 flex-1 w-full">
                                            <label className="text-xs font-medium text-gray-500">End Date</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    value={dateRange.endDate}
                                                    min={dateRange.startDate}
                                                    onChange={(e) => {
                                                        const newEndDate = e.target.value;
                                                        if (dateRange.startDate && newEndDate < dateRange.startDate) {
                                                            alert("End date cannot be earlier than start date");
                                                            return;
                                                        }
                                                        setDateRange(prev => ({ ...prev, endDate: newEndDate }));
                                                    }}
                                                    className="w-full rounded-lg border-gray-200 bg-gray-50/50 pl-4 pr-4 py-2 text-sm focus:border-[#991B1B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#991B1B] transition-all"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={filterTasksByDateRange}
                                            className="w-full md:w-auto h-[38px] bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                                        >
                                            Apply Filter
                                        </button>
                                        <button
                                            onClick={generatePDFReport}
                                            className="w-full md:w-auto h-[38px] bg-[#991B1B] hover:bg-[#7f1616] text-white px-6 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                                        >
                                            <FileBarChart className="h-4 w-4" />
                                            Generate Report (PDF)
                                        </button>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        <MISStatCard
                                            label="Total Tasks"
                                            value={misStats.totalTasks}
                                            icon={<ListTodo className="h-5 w-5 text-blue-600" />}
                                            bg="bg-blue-50"
                                            accent="blue"
                                        />
                                        <MISStatCard
                                            label="Completed"
                                            value={misStats.completedTasks}
                                            subValue={`${misStats.completionRate}% Rate`}
                                            icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
                                            bg="bg-green-50"
                                            accent="green"
                                            progress={misStats.completionRate}
                                        />
                                        <MISStatCard
                                            label="Pending / Overdue"
                                            value={misStats.pendingTasks + misStats.overdueTasks}
                                            alert={true}
                                            icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
                                            bg="bg-red-50"
                                            accent="red"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "staff" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-900">Staff Performance Analysis</h3>
                                            <p className="text-xs text-gray-500 mt-1">Detailed breakdown of staff efficiency and task completion</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <select
                                                value={performanceMonth}
                                                onChange={(e) => setPerformanceMonth(parseInt(e.target.value))}
                                                className="rounded-lg border-gray-200 bg-gray-50 text-sm py-1.5 focus:border-[#991B1B] focus:ring-[#991B1B]"
                                            >
                                                <option value={-1}>All Months</option>
                                                {Array.from({ length: 12 }, (_, i) => (
                                                    <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={performanceYear}
                                                onChange={(e) => setPerformanceYear(parseInt(e.target.value))}
                                                className="rounded-lg border-gray-200 bg-gray-50 text-sm py-1.5 focus:border-[#991B1B] focus:ring-[#991B1B]"
                                            >
                                                <option value={-1}>All Years</option>
                                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                                    <option key={year} value={year}>{year}</option>
                                                ))}
                                            </select>
                                            <div className="p-2 bg-gray-50 rounded-lg hidden sm:block">
                                                <UserCheck className="h-4 w-4 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6">
                                        <StaffTasksTable />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stat Tasks Modal */}
            {statModal.isOpen && (
                <StatTasksModal
                    isOpen={statModal.isOpen}
                    onClose={() => setStatModal({ ...statModal, isOpen: false })}
                    title={statModal.title}
                    tasks={departmentData.allTasks.filter(t => {
                        if (statModal.type === 'all') return true;
                        return t.status === statModal.type;
                    })}
                />
            )}
        </AdminLayout>
    )
}

// Subcomponents
const StatCard = ({ title, value, description, icon, accentColor = "gray", alert = false, onClick }: { title: string; value: string | number; description: string; icon?: any; accentColor?: string; alert?: boolean; onClick?: () => void }) => {
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

const BottomTab = ({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: any }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-lg ${active
            ? "bg-[#991B1B] text-white shadow-sm"
            : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
    >
        {icon}
        {label}
    </button>
)

const MISStatCard = ({ label, value, subValue, alert = false, icon, bg, accent, progress }: { label: string, value: string | number, subValue?: string, alert?: boolean, icon: any, bg: string, accent: string, progress?: number | string }) => {
    const textColor = alert ? 'text-red-700' : (accent === 'blue' ? 'text-blue-700' : 'text-green-700');

    return (
        <div className={`p-5 rounded-xl border border-gray-100 bg-white hover:shadow-md transition-all duration-200 group`}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-xs font-medium text-gray-500">{label}</p>
                    <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">{value}</span>
                        {subValue && (
                            <span className={`text-xs font-medium ${textColor} bg-opacity-10 px-1.5 py-0.5 rounded-full ${bg}`}>
                                {subValue}
                            </span>
                        )}
                    </div>
                </div>
                <div className={`p-2.5 rounded-full ${bg} group-hover:scale-110 transition-transform duration-200`}>
                    {icon}
                </div>
            </div>
            {progress !== undefined && (
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${alert ? 'bg-red-500' : (accent === 'blue' ? 'bg-blue-500' : 'bg-green-500')}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
            {!progress && (
                <div className="h-1.5 mt-2"></div>
            )}
        </div>
    )
}





const StatTasksModal = ({ isOpen, onClose, title, tasks }: { isOpen: boolean; onClose: () => void; title: string; tasks: Task[] }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDept, setSelectedDept] = useState("all");
    const [selectedStaff, setSelectedStaff] = useState("all");
    const itemsPerPage = 10;

    // Reset filters and page when modal opens or title changes
    useEffect(() => {
        if (isOpen) {
            setCurrentPage(1);
            setSearchQuery("");
            setSelectedDept("all");
            setSelectedStaff("all");
        }
    }, [isOpen, title]);

    // Extract unique values for dropdowns
    const uniqueDepartments = Array.from(new Set(tasks.map(t => t.department))).filter(Boolean);
    const uniqueStaff = Array.from(new Set(tasks.map(t => t.assignedTo))).filter(Boolean);

    // Filter tasks
    const filteredTasks = tasks.filter(task => {
        const matchesSearch = (task.title || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = selectedDept === "all" || task.department === selectedDept;
        const matchesStaff = selectedStaff === "all" || task.assignedTo === selectedStaff;
        return matchesSearch && matchesDept && matchesStaff;
    });

    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage);

    // Reset page if filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedDept, selectedStaff]);

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
                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="rounded-lg border-gray-200 text-sm py-2 px-3 focus:border-[#991B1B] focus:ring-[#991B1B]"
                        >
                            <option value="all">All Departments</option>
                            {uniqueDepartments.map((dept: any) => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                        <select
                            value={selectedStaff}
                            onChange={(e) => setSelectedStaff(e.target.value)}
                            className="rounded-lg border-gray-200 text-sm py-2 px-3 focus:border-[#991B1B] focus:ring-[#991B1B]"
                        >
                            <option value="all">All Staff</option>
                            {uniqueStaff.map((staff: any) => (
                                <option key={staff} value={staff}>{staff}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {filteredTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                            <div className="rounded-full bg-gray-50 p-4 mb-3">
                                <ListTodo className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="font-medium">No tasks found</p>
                            <p className="text-sm">Try adjusting your filters.</p>
                        </div>
                    ) : (
                        <div className="border border-gray-100 rounded-lg overflow-hidden bg-white">
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
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
                                        {currentTasks.map((task) => (
                                            <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize 
                                                        ${task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                            task.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                                                'bg-amber-100 text-amber-800'}`}>
                                                        {task.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900 line-clamp-2" title={task.title}>
                                                        {task.title}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-600">{task.assignedTo}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-600 font-mono">{task.dueDate}</div>
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
                            <div className="md:hidden divide-y divide-gray-100">
                                {currentTasks.map((task) => (
                                    <div key={task.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="text-sm font-medium text-gray-900 line-clamp-2" title={task.title}>
                                                {task.title}
                                            </div>
                                            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize 
                                                ${task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    task.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                                        'bg-amber-100 text-amber-800'}`}>
                                                {task.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium text-gray-700">Due:</span>
                                                <span className="font-mono">{task.dueDate}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium text-gray-700">To:</span>
                                                <span className="truncate">{task.assignedTo}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 col-span-2">
                                                <span className="font-medium text-gray-700">Freq:</span>
                                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{task.frequency}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
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

