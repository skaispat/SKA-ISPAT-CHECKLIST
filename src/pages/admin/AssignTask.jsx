import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { BellRing, FileCheck, Calendar, ChevronLeft, ChevronRight, Check } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import { supabase } from "../../supabase"
import Toast from "../../components/Toast"

// Calendar Component
const CalendarComponent = ({ date, onChange, onClose }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date())

    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (year, month) => {
        return new Date(year, month, 1).getDay()
    }

    const handleDateClick = (day) => {
        const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
        onChange(selectedDate)
        onClose()
    }

    const renderDays = () => {
        const days = []
        const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth())
        const firstDayOfMonth = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth())

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-9 w-9"></div>)
        }

        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const isSelected =
                date &&
                date.getDate() === day &&
                date.getMonth() === currentMonth.getMonth() &&
                date.getFullYear() === currentMonth.getFullYear()

            const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === currentMonth.getMonth() &&
                new Date().getFullYear() === currentMonth.getFullYear()

            days.push(
                <button
                    key={day}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 
            ${isSelected
                            ? "bg-[#991B1B] text-white shadow-md shadow-red-200"
                            : isToday
                                ? "text-[#991B1B] bg-red-50 font-bold"
                                : "hover:bg-gray-100 text-gray-700"
                        }`}
                >
                    {day}
                </button>
            )
        }

        return days
    }

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    }

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    }

    return (
        <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-xl w-[320px] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
                <button type="button" onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-full text-gray-500 hover:text-gray-900 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-base font-semibold text-gray-900">
                    {currentMonth.toLocaleString("default", { month: "long" })} {currentMonth.getFullYear()}
                </div>
                <button type="button" onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-full text-gray-500 hover:text-gray-900 transition-colors">
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                    <div key={day} className="h-9 w-9 flex items-center justify-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
        </div>
    )
}

// Helper functions for date manipulation


const addDays = (date, days) => {
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() + days)
    return newDate
}

const addMonths = (date, months) => {
    const newDate = new Date(date)
    newDate.setMonth(newDate.getMonth() + months)
    return newDate
}

const addYears = (date, years) => {
    const newDate = new Date(date)
    newDate.setFullYear(newDate.getFullYear() + years)
    return newDate
}

// Add this date formatting helper function
const formatDateToDDMMYYYY = (date) => {
    const d = new Date(date)
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
}

export default function AssignTask() {
    const navigate = useNavigate()
    const [date, setSelectedDate] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [generatedTasks, setGeneratedTasks] = useState([])
    const [showCalendar, setShowCalendar] = useState(false)
    const [accordionOpen, setAccordionOpen] = useState(false)
    const [workingDays, setWorkingDays] = useState([]) // Store working days
    const [generationError, setGenerationError] = useState(null)
    const [showToast, setShowToast] = useState(null)
    const calendarRef = useRef(null)

    // Check for admin role
    useEffect(() => {
        const role = sessionStorage.getItem('role')
        // Enforce strict admin access
        if (role !== 'admin') {
            alert("Access Denied: Only Admins can assign tasks.")
            navigate("/dashboard/admin")
        }
    }, [navigate])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                setShowCalendar(false)
            }
        }

        if (showCalendar) {
            document.addEventListener("mousedown", handleClickOutside)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [showCalendar])

    // Add new state variables for dropdown options
    const [departmentOptions, setDepartmentOptions] = useState([])
    const [givenByOptions, setGivenByOptions] = useState([]) // Stores {username, full_name} objects
    const [doerOptions, setDoerOptions] = useState([]) // Stores {username, full_name} objects

    const frequencies = [
        { value: "one-time", label: "One Time (No Recurrence)" },
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
        { value: "monthly", label: "Monthly" },
        { value: "quarterly", label: "Quarterly" },
        { value: "yearly", label: "Yearly" },
        { value: "end-of-1st-week", label: "End of 1st Week" },
        { value: "end-of-2nd-week", label: "End of 2nd Week" },
        { value: "end-of-3rd-week", label: "End of 3rd Week" },
        { value: "end-of-4th-week", label: "End of 4th Week" },
        { value: "end-of-last-week", label: "End of Last Week" },
    ]

    const [formData, setFormData] = useState({
        department: "",
        givenBy: "",
        doer: "",
        title: "",
        description: "",
        frequency: "daily",
        enableReminders: true,
        requireAttachment: false,
    })

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }



    // Function to fetch options from Supabase
    const fetchDropdownData = async () => {
        try {
            // Fetch Departments
            const { data: departmentsData, error: deptError } = await supabase
                .from('departments')
                .select('dept_name')
                .eq('is_active', true)
                .order('dept_name');

            if (deptError) throw deptError;

            // Fetch Users (for Given By and Doer)
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('full_name, username, role')
                .eq('status', 'active')
                .order('full_name');

            if (usersError) throw usersError;

            if (departmentsData) {
                setDepartmentOptions(departmentsData.map(d => d.dept_name));
            }

            if (usersData) {
                // Doer can be any active user
                setDoerOptions(usersData);

                // Assigned By must be an Admin
                const admins = usersData.filter(u => u.role === 'admin');
                setGivenByOptions(admins);
            }

            console.log("Supabase options loaded successfully");

        } catch (error) {
            console.error("Error fetching dropdown options from Supabase:", error)
            // Fallback empty or default options could be set here if needed
        }
    }

    // Update date display format
    const getFormattedDate = (date) => {
        if (!date) return "Select date"
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    useEffect(() => {
        fetchDropdownData()
        fetchWorkingDays().then(data => {
            if (data) setWorkingDays(data);
        })
    }, [])



    // Function to fetch working days from Supabase
    const fetchWorkingDays = async () => {
        try {
            const { data, error } = await supabase
                .from('working_days')
                .select('date')
                .eq('is_working_day', true)
                .order('date', { ascending: true });

            if (error) throw error;

            if (!data || data.length === 0) {
                console.log("No working day data found in Supabase");
                return [];
            }

            // Extract dates and format to DD/MM/YYYY
            const workingDays = data.map(record => formatDateToDDMMYYYY(record.date));

            console.log(`Fetched ${workingDays.length} working days from Supabase`);
            return workingDays;
        } catch (error) {
            console.error("Error fetching working days:", error);
            return []; // Return empty array if fetch fails
        }
    };

    // Helper function to find the closest working day to a target date
    const findClosestWorkingDayIndex = (workingDays, targetDateStr) => {
        // Parse the target date
        const [targetDay, targetMonth, targetYear] = targetDateStr.split('/').map(Number);
        const targetDate = new Date(targetYear, targetMonth - 1, targetDay);

        // Find the closest working day (preferably after the target date)
        let closestIndex = -1;
        let minDifference = Infinity;

        for (let i = 0; i < workingDays.length; i++) {
            const [workingDay, workingMonth, workingYear] = workingDays[i].split('/').map(Number);
            const currentDate = new Date(workingYear, workingMonth - 1, workingDay);

            // Calculate difference in days
            const difference = Math.abs((currentDate - targetDate) / (1000 * 60 * 60 * 24));

            if (currentDate >= targetDate && difference < minDifference) {
                minDifference = difference;
                closestIndex = i;
            }
        }

        // Return -1 if no working day found after the target date
        return closestIndex;
    };

    // Helper function to find the date for the end of a specific week in a month
    const findEndOfWeekDate = (date, weekNumber, workingDays) => {
        const year = date.getFullYear();
        const month = date.getMonth();

        // Get all working days in the target month
        const daysInMonth = workingDays.filter(dateStr => {
            const [, m, y] = dateStr.split('/').map(Number);
            return y === year && m === month + 1;
        });

        // Sort them chronologically
        daysInMonth.sort((a, b) => {
            const [dayA] = a.split('/').map(Number);
            const [dayB] = b.split('/').map(Number);
            return dayA - dayB;
        });

        // Group by weeks (assuming Monday is the first day of the week)
        const weekGroups = [];
        let currentWeek = [];
        let lastWeekDay = -1;

        for (const dateStr of daysInMonth) {
            const [workingDay2, m, y] = dateStr.split('/').map(Number);
            const dateObj = new Date(y, m - 1, workingDay2);
            const weekDay = dateObj.getDay(); // 0 for Sunday, 1 for Monday, etc.

            if (weekDay <= lastWeekDay || currentWeek.length === 0) {
                if (currentWeek.length > 0) {
                    weekGroups.push(currentWeek);
                }
                currentWeek = [dateStr];
            } else {
                currentWeek.push(dateStr);
            }

            lastWeekDay = weekDay;
        }

        if (currentWeek.length > 0) {
            weekGroups.push(currentWeek);
        }

        // Return the last day of the requested week
        if (weekNumber === -1) {
            // Last week of the month
            return weekGroups[weekGroups.length - 1]?.[weekGroups[weekGroups.length - 1].length - 1] || daysInMonth[daysInMonth.length - 1];
        } else if (weekNumber > 0 && weekNumber <= weekGroups.length) {
            // Specific week
            return weekGroups[weekNumber - 1]?.[weekGroups[weekNumber - 1].length - 1] || daysInMonth[daysInMonth.length - 1];
        } else {
            // Default to the last day of the month if the requested week doesn't exist
            return daysInMonth[daysInMonth.length - 1];
        }
    };

    // Check if Assigned By and Assigned To are the same person
    const selectedDoer = doerOptions.find(u => u.full_name === formData.doer);
    const isSameUser = formData.givenBy && formData.doer && selectedDoer && selectedDoer.username === formData.givenBy;

    // Generate tasks based on frequency
    const generateTasks = async (isAuto = false) => {
        setGenerationError(null); // Clear previous errors

        if (isSameUser) {
            const msg = "Assigned By and Assigned To cannot be the same person.";
            if (!isAuto) alert(msg);
            else setGenerationError(msg);
            return;
        }

        // Strict check for required fields
        if (!date || !formData.doer || !formData.title || !formData.frequency || !formData.description || !formData.department || !formData.givenBy) {
            if (!isAuto) alert("Please fill in all required fields.");
            return;
        }

        // --- Handling End of Week (Month Selection) ---
        if (formData.frequency.startsWith("end-of-")) {
            // For End of Week, date is just a Date object pointing to the selected month/year
            const year = date.getFullYear();
            const month = date.getMonth(); // 0-indexed

            // Get all Saturdays in the month
            const saturdays = [];
            const d = new Date(year, month, 1);

            // Find first Saturday
            while (d.getDay() !== 6) {
                d.setDate(d.getDate() + 1);
            }

            // Collect all Saturdays
            while (d.getMonth() === month) {
                saturdays.push(new Date(d));
                d.setDate(d.getDate() + 7);
            }

            let targetDate;
            switch (formData.frequency) {
                case "end-of-1st-week":
                    targetDate = saturdays[0];
                    break;
                case "end-of-2nd-week":
                    targetDate = saturdays[1];
                    break;
                case "end-of-3rd-week":
                    targetDate = saturdays[2];
                    break;
                case "end-of-4th-week":
                    targetDate = saturdays[3];
                    break;
                case "end-of-last-week":
                    targetDate = saturdays[saturdays.length - 1];
                    break;
                default:
                    targetDate = null;
            }

            if (!targetDate) {
                const msg = "The selected week does not have a Saturday in this month.";
                if (!isAuto) alert(msg);
                else setGenerationError(msg);
                return;
            }

            const formattedTargetDate = formatDateToDDMMYYYY(targetDate);

            // Generate Single Task
            setGeneratedTasks([{
                title: formData.title,
                description: formData.description,
                department: formData.department,
                givenBy: formData.givenBy,
                doer: formData.doer,
                dueDate: formattedTargetDate,
                status: "pending",
                frequency: formData.frequency,
                enableReminders: formData.enableReminders,
                requireAttachment: formData.requireAttachment,
            }]);
            setAccordionOpen(true);
            return;
        }


        // --- Handling Standard Frequencies (Daily, Monthly, etc.) ---

        // Create future dates array
        let futureDates = [];

        if (workingDays.length > 0) {
            // Sort the working days chronologically
            const sortedWorkingDays = [...workingDays].sort((a, b) => {
                const [dayA, monthA, yearA] = a.split('/').map(Number);
                const [dayB, monthB, yearB] = b.split('/').map(Number);
                return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
            });

            const selectedDateObj = new Date(date);

            // Filter out dates before the selected date (no back dates)
            futureDates = sortedWorkingDays.filter(dateStr => {
                const [dateDay, month, year] = dateStr.split('/').map(Number);
                const dateObj = new Date(year, month - 1, dateDay);
                return dateObj >= selectedDateObj;
            });
        } else {
            // Fallback: Generate the next 365 days including today/selected date
            const selectedDateObj = new Date(date);
            for (let i = 0; i < 365; i++) {
                const d = addDays(selectedDateObj, i);
                futureDates.push(formatDateToDDMMYYYY(d));
            }
        }

        // If no future working days are available from the selected date (mainly for workingDays logic)
        if (futureDates.length === 0) {
            const msg = "No valid dates found starting from your selected date.";
            if (!isAuto) alert(msg);
            else setGenerationError(msg);
            return;
        }

        // Find the start date in working days (it should be index 0 if we generated or filtered correctly)
        // logic below was finding index in filtered array which matches.
        const startDateStr = formatDateToDDMMYYYY(new Date(date));

        // If workingDays existed, we verified connectivity.
        // If fallback, futureDates[0] is startDateStr.
        let startIndex = 0;

        // Minor check if exact match exists in futureDates for safety, though filter logic handles it
        const actualStartIndex = futureDates.findIndex(d => d === startDateStr);
        if (actualStartIndex !== -1) startIndex = actualStartIndex;
        // If for some reason filtered list doesn't include start date (e.g. holiday in working days), 
        // we just start from the first available future date (index 0).

        const tasks = [];

        // Determine scope based on frequency
        if (formData.frequency === "one-time") {
            // Generate 1 task
            const taskDateStr = futureDates[startIndex];
            tasks.push({
                title: formData.title,
                description: formData.description,
                department: formData.department,
                givenBy: formData.givenBy,
                doer: formData.doer,
                dueDate: taskDateStr,
                status: "pending",
                frequency: formData.frequency,
                enableReminders: formData.enableReminders,
                requireAttachment: formData.requireAttachment,
            });
        } else if (formData.frequency === "daily") {
            // Generate tasks for next 365 working days (or less if calendar ends)
            const limit = 365;
            for (let i = startIndex; i < futureDates.length && i < startIndex + limit; i++) {
                const taskDateStr = futureDates[i];
                tasks.push({
                    title: formData.title,
                    description: formData.description,
                    department: formData.department,
                    givenBy: formData.givenBy,
                    doer: formData.doer,
                    dueDate: taskDateStr,
                    status: "pending",
                    frequency: formData.frequency,
                    enableReminders: formData.enableReminders,
                    requireAttachment: formData.requireAttachment,
                });
            }
        } else if (formData.frequency === "yearly") {
            // Generate 1 task on the selected date and month for the next year
            const selectedDateObj = new Date(date);
            const targetDate = addYears(selectedDateObj, 1);
            let targetDateStr = formatDateToDDMMYYYY(targetDate);

            if (workingDays.length > 0) {
                const closestIndex = findClosestWorkingDayIndex(workingDays, targetDateStr);
                if (closestIndex !== -1) {
                    targetDateStr = workingDays[closestIndex];
                }
            }

            tasks.push({
                title: formData.title,
                description: formData.description,
                department: formData.department,
                givenBy: formData.givenBy,
                doer: formData.doer,
                dueDate: targetDateStr,
                status: "pending",
                frequency: formData.frequency,
                enableReminders: formData.enableReminders,
                requireAttachment: formData.requireAttachment,
            });
        } else if (formData.frequency === "monthly") {
            // Generate 1 task for each of the next 12 months (Total 12 tasks)
            const selectedDateObj = new Date(date);

            for (let i = 0; i < 12; i++) {
                // Calculate target date: start date + i months
                let targetDate = addMonths(selectedDateObj, i);
                let targetDateStr = formatDateToDDMMYYYY(targetDate);

                // If working days logic is active, align to closest working day
                if (workingDays.length > 0) {
                    const closestIndex = findClosestWorkingDayIndex(workingDays, targetDateStr);
                    if (closestIndex !== -1) {
                        targetDateStr = workingDays[closestIndex];
                    }
                }

                tasks.push({
                    title: formData.title,
                    description: formData.description,
                    department: formData.department,
                    givenBy: formData.givenBy,
                    doer: formData.doer,
                    dueDate: targetDateStr,
                    status: "pending",
                    frequency: formData.frequency,
                    enableReminders: formData.enableReminders,
                    requireAttachment: formData.requireAttachment,
                });
            }

        } else if (formData.frequency === "quarterly") {
            // Generate 1 task every 3 months (Total 4 tasks for a year)
            const selectedDateObj = new Date(date);

            for (let i = 0; i < 4; i++) {
                // Calculate target date: start date + (i * 3) months
                let targetDate = addMonths(selectedDateObj, i * 3);
                let targetDateStr = formatDateToDDMMYYYY(targetDate);

                // If working days logic is active, align to closest working day
                if (workingDays.length > 0) {
                    const closestIndex = findClosestWorkingDayIndex(workingDays, targetDateStr);
                    if (closestIndex !== -1) {
                        targetDateStr = workingDays[closestIndex];
                    }
                }

                tasks.push({
                    title: formData.title,
                    description: formData.description,
                    department: formData.department,
                    givenBy: formData.givenBy,
                    doer: formData.doer,
                    dueDate: targetDateStr,
                    status: "pending",
                    frequency: formData.frequency,
                    enableReminders: formData.enableReminders,
                    requireAttachment: formData.requireAttachment,
                });
            }
        } else if (formData.frequency === "weekly") {
            // Keep original weekly logic (recurrence every 7 days) if needed, 
            // but user did not specify changes for "Weekly" in the prompt, 
            // however, context implies "Daily checklist".
            // If user selects "Weekly", maybe they want Weekly recurrence?
            // Prompt only specified behaviors for: One Time, Daily, Monthly, Quarterly, Yearly, End of Week.
            // I will leave Weekly as classic recurrence to be safe, or just exclude it if inconsistent.
            // Since "Weekly" is in the list, I'll stick to Recurrence logic for it as fallback, 
            // OR assume it follows the pattern? No, "Weekly - Generate 1 week task" was not said.
            // I'll stick to the original logic for Weekly for now.

            let currentIndex = startIndex;
            while (currentIndex < futureDates.length) {
                const taskDateStr = futureDates[currentIndex];

                tasks.push({
                    title: formData.title,
                    description: formData.description,
                    department: formData.department,
                    givenBy: formData.givenBy,
                    doer: formData.doer,
                    dueDate: taskDateStr,
                    status: "pending",
                    frequency: formData.frequency,
                    enableReminders: formData.enableReminders,
                    requireAttachment: formData.requireAttachment,
                });

                // Find date + 7 days
                const [d, m, y] = taskDateStr.split('/').map(Number);
                const currentDate = new Date(y, m - 1, d);
                const targetDate = addDays(currentDate, 7);
                const targetDateStr = formatDateToDDMMYYYY(targetDate);

                const nextIndex = findClosestWorkingDayIndex(futureDates, targetDateStr);
                if (nextIndex !== -1 && nextIndex > currentIndex) {
                    currentIndex = nextIndex;
                } else {
                    break;
                }
            }
        }

        setGeneratedTasks(tasks);
        if (tasks.length > 0) setAccordionOpen(true);
    };

    // Auto-generate tasks when fields change
    useEffect(() => {
        const timer = setTimeout(() => {
            // Check if required fields are present before trying to auto-generate
            if (date && formData.doer && formData.title && formData.frequency && formData.description && formData.department && formData.givenBy) {
                generateTasks(true);
            } else {
                setGeneratedTasks([]); // Clear tasks if required fields are missing
                setGenerationError(null);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [date, formData, workingDays]);

    // Update handleSubmit function to handle one-time tasks differently
    const handleCancel = () => {
        if (window.confirm("Are you sure you want to cancel? All unsaved changes will be lost.")) {
            setFormData({
                department: "",
                givenBy: "",
                doer: "",
                title: "",
                description: "",
                frequency: "daily",
                enableReminders: true,
                requireAttachment: false,
            })
            setSelectedDate(null)
            setGeneratedTasks([])
            setAccordionOpen(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (generatedTasks.length === 0) {
                alert("Please generate tasks first by clicking Preview Generated Tasks");
                setIsSubmitting(false);
                return;
            }

            // Get current time in India (IST) for timestamp
            const now = new Date();
            const timeInIndia = now.toLocaleTimeString('en-GB', {
                timeZone: 'Asia/Kolkata',
                hour12: false,
            });
            const timestampIST = `${timeInIndia}+05:30`;

            // Prepare all tasks data for batch insertion to Supabase
            const tasksToInsert = generatedTasks.map((task) => {
                // Convert DD/MM/YYYY to YYYY-MM-DD for Postgres date
                const [day, month, year] = task.dueDate.split('/');
                const formattedDate = `${year}-${month}-${day}`;

                return {
                    timestamp: timestampIST, // Send Kolkata time with offset
                    department: task.department,
                    given_by_username: task.givenBy, // This is now the username
                    name: task.doer, // This is the full name
                    task_title: task.title,
                    task_description: task.description,
                    task_start_date: formattedDate, // Mapped to task_start_date in DB
                    freq: task.frequency,
                    enable_reminders: task.enableReminders,
                    require_attachment: task.requireAttachment,
                    status: 'pending' // Default status
                };
            });

            console.log(`Submitting ${tasksToInsert.length} tasks to Supabase:`, tasksToInsert);

            const { error } = await supabase
                .from('master_tasks')
                .insert(tasksToInsert);

            if (error) throw error;

            // Show a success message
            setShowToast({ message: `Successfully submitted ${generatedTasks.length} tasks!`, type: "success" });

            // Reset form
            setFormData({
                department: "",
                givenBy: "",
                doer: "",
                title: "",
                description: "",
                frequency: "daily",
                enableReminders: true,
                requireAttachment: false,
            });
            setSelectedDate(null);
            setGeneratedTasks([]);
            setAccordionOpen(false);
        } catch (error) {
            console.error('Submission error:', error);
            setShowToast({ message: `Failed to assign tasks: ${error.message}`, type: "error" });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <AdminLayout>
            {showToast && (
                <Toast
                    message={showToast.message}
                    type={showToast.type}
                    onClose={() => setShowToast(null)}
                />
            )}
            <div className="max-w-6xl mx-auto py-6 px-4">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Assign New Task</h1>
                        <p className="text-sm text-gray-600">Delegating tasks made simple.</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                    <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
                        {/* Main Form Fields */}
                        <div className="p-5 space-y-4">

                            {/* Row 1: Dropdowns (Department, Given By, Doer, Frequency) - 4 Columns */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Department Name Dropdown */}
                                <div className="space-y-1">
                                    <label htmlFor="department" className="block text-xs font-medium text-gray-700">
                                        Department <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="department"
                                            name="department"
                                            value={formData.department}
                                            onChange={handleChange}
                                            required
                                            className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#991B1B] focus:outline-none focus:ring-1 focus:ring-[#991B1B] transition-all"
                                        >
                                            <option value="">Select Dept</option>
                                            {departmentOptions.map((dept, index) => (
                                                <option key={index} value={dept}>
                                                    {dept}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                            <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Given By Dropdown */}
                                <div className="space-y-1">
                                    <label htmlFor="givenBy" className="block text-xs font-medium text-gray-700">
                                        Assigned By <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="givenBy"
                                            name="givenBy"
                                            value={formData.givenBy}
                                            onChange={handleChange}
                                            required
                                            className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#991B1B] focus:outline-none focus:ring-1 focus:ring-[#991B1B] transition-all"
                                        >
                                            <option value="">Select Delegator</option>
                                            {givenByOptions.map((user) => (
                                                <option key={user.username} value={user.username}>
                                                    {user.full_name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                            <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Doer's Name Dropdown */}
                                <div className="space-y-1">
                                    <label htmlFor="doer" className="block text-xs font-medium text-gray-700">
                                        Assigned To (Doer) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="doer"
                                            name="doer"
                                            value={formData.doer}
                                            onChange={handleChange}
                                            required
                                            className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#991B1B] focus:outline-none focus:ring-1 focus:ring-[#991B1B] transition-all"
                                        >
                                            <option value="">Select Doer</option>
                                            {doerOptions.map((user) => (
                                                <option key={user.username} value={user.full_name}>
                                                    {user.full_name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                            <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                        </div>
                                    </div>
                                    {isSameUser && (
                                        <p className="text-[10px] text-red-500 font-medium mt-1">
                                            Cannot assign to same person
                                        </p>
                                    )}
                                </div>

                                {/* Start Date / Select Month */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-700">
                                        {formData.frequency.startsWith("end-of-") ? "Select Month" : "Start Date"} <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        {formData.frequency.startsWith("end-of-") ? (
                                            <div className="relative">
                                                <input
                                                    type="month"
                                                    required
                                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#991B1B] focus:outline-none focus:ring-1 focus:ring-[#991B1B] transition-all"
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            const [year, month] = e.target.value.split('-');
                                                            const selected = new Date(year, month - 1, 1);
                                                            setSelectedDate(selected);
                                                        } else {
                                                            setSelectedDate(null);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCalendar(!showCalendar)}
                                                    className="w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 focus:border-[#991B1B] focus:outline-none focus:ring-1 focus:ring-[#991B1B] transition-all"
                                                >
                                                    <span className={`truncate ${date ? "text-gray-900" : "text-gray-400"}`}>
                                                        {getFormattedDate(date)}
                                                    </span>
                                                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                                                </button>

                                                {showCalendar && (
                                                    <div ref={calendarRef} className="absolute z-10 mt-2 right-0">
                                                        <CalendarComponent
                                                            date={date}
                                                            onChange={setSelectedDate}
                                                            onClose={() => setShowCalendar(false)}
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Title and Frequency - Frequency moved here */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-3 space-y-1">
                                    <label htmlFor="title" className="block text-xs font-medium text-gray-700">
                                        Task Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="title"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="Enter a concise title"
                                        required
                                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#991B1B] focus:outline-none focus:ring-1 focus:ring-[#991B1B] transition-all"
                                    />
                                </div>

                                {/* Frequency Dropdown - Moved from Row 1 */}
                                <div className="space-y-1">
                                    <label htmlFor="frequency" className="block text-xs font-medium text-gray-700">
                                        Frequency <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="frequency"
                                            name="frequency"
                                            value={formData.frequency}
                                            onChange={handleChange}
                                            required
                                            className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#991B1B] focus:outline-none focus:ring-1 focus:ring-[#991B1B] transition-all"
                                        >
                                            {frequencies.map((freq) => (
                                                <option key={freq.value} value={freq.value}>
                                                    {freq.label}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                            <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Description and Options - Split Layout */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 space-y-1">
                                    <label htmlFor="description" className="block text-xs font-medium text-gray-700">
                                        Description <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Details..."
                                        rows={3}
                                        required
                                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#991B1B] focus:outline-none focus:ring-1 focus:ring-[#991B1B] transition-all resize-none"
                                    />
                                </div>

                                <div className="space-y-2 pt-5">
                                    <div onClick={() => setFormData(prev => ({ ...prev, enableReminders: !formData.enableReminders }))}
                                        className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${formData.enableReminders
                                            ? "border-red-200 bg-red-50"
                                            : "border-gray-200 hover:bg-gray-50"
                                            }`}>
                                        <div className="flex items-center space-x-2">
                                            <div className={`p-1.5 rounded-full ${formData.enableReminders ? 'bg-white text-[#991B1B]' : 'bg-gray-100 text-gray-500'}`}>
                                                <BellRing className="h-4 w-4" />
                                            </div>
                                            <span className={`text-xs font-medium ${formData.enableReminders ? 'text-[#991B1B]' : 'text-gray-700'}`}>Reminders</span>
                                        </div>
                                        {formData.enableReminders && <Check className="h-3 w-3 text-[#991B1B]" />}
                                    </div>

                                    <div onClick={() => setFormData(prev => ({ ...prev, requireAttachment: !formData.requireAttachment }))}
                                        className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${formData.requireAttachment
                                            ? "border-red-200 bg-red-50"
                                            : "border-gray-200 hover:bg-gray-50"
                                            }`}>
                                        <div className="flex items-center space-x-2">
                                            <div className={`p-1.5 rounded-full ${formData.requireAttachment ? 'bg-white text-[#991B1B]' : 'bg-gray-100 text-gray-500'}`}>
                                                <FileCheck className="h-4 w-4" />
                                            </div>
                                            <span className={`text-xs font-medium ${formData.requireAttachment ? 'text-[#991B1B]' : 'text-gray-700'}`}>Attachment</span>
                                        </div>
                                        {formData.requireAttachment && <Check className="h-3 w-3 text-[#991B1B]" />}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Generated Tasks Preview (Compact) */}
                        {generatedTasks.length > 0 && (
                            <div className="bg-gray-50/50 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setAccordionOpen(!accordionOpen)}
                                    className="w-full flex justify-between items-center p-3 px-5 text-gray-900 hover:bg-gray-50 focus:outline-none transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className="flex items-center justify-center bg-[#991B1B] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {generatedTasks.length}
                                        </span>
                                        <span className="font-semibold text-sm">Tasks Generated</span>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${accordionOpen ? "rotate-90" : ""}`} />
                                </button>

                                {accordionOpen && (
                                    <div className="px-5 pb-3 border-t border-gray-100 bg-white">
                                        <div className="max-h-[200px] overflow-y-auto space-y-1.5 pt-3 pr-1">
                                            {generatedTasks.map((task, index) => (
                                                <div key={index} className="flex items-center justify-between p-2 rounded border border-gray-100 bg-white hover:border-gray-200 transition-colors">
                                                    <div className="flex-1 min-w-0 mr-2">
                                                        <p className="font-medium text-gray-900 text-xs truncate">{task.title}</p>
                                                        <p className="text-[10px] text-gray-500">Due: {task.dueDate}</p>
                                                    </div>
                                                    <div className="flex space-x-1 flex-shrink-0">
                                                        {task.enableReminders && (
                                                            <span className="text-[9px] uppercase font-semibold bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">
                                                                R
                                                            </span>
                                                        )}
                                                        {task.requireAttachment && (
                                                            <span className="text-[9px] uppercase font-semibold bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">
                                                                A
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="p-6 bg-gray-50 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4 border-t border-gray-100">
                            {/* Cancel Button - Only visible when fields are entered */}
                            {(formData.department ||
                                formData.givenBy ||
                                formData.doer ||
                                formData.title ||
                                formData.description ||
                                formData.frequency !== "daily" ||
                                !formData.enableReminders ||
                                formData.requireAttachment ||
                                date ||
                                generatedTasks.length > 0) && (
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white py-2.5 px-6 text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-2 transition-all mr-auto"
                                    >
                                        Cancel
                                    </button>
                                )}
                            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                                {!generatedTasks.length > 0 ? (
                                    <div className={`text-sm py-2 ${generationError ? "text-red-500 font-medium" : "text-gray-500 italic"}`}>
                                        {generationError || "Fill in required fields to see task preview..."}
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setGeneratedTasks([])
                                                setAccordionOpen(false)
                                            }}
                                            className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white py-2.5 px-6 text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-2 transition-all"
                                        >
                                            Clear Preview
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full sm:w-auto rounded-lg bg-[#991B1B] py-2.5 px-6 text-white font-medium hover:bg-[#7f1d1d] focus:outline-none focus:ring-2 focus:ring-[#991B1B] focus:ring-offset-2 transition-all shadow-md shadow-red-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Assigning...
                                                </>
                                            ) : "Confirm & Assign Tasks"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    )
}
