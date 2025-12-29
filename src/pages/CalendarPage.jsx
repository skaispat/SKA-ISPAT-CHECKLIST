"use client"

import { useState, useEffect } from "react"
import { Calendar, dateFnsLocalizer } from "react-big-calendar"
import format from "date-fns/format"
import parse from "date-fns/parse"
import startOfWeek from "date-fns/startOfWeek"
import getDay from "date-fns/getDay"
import enUS from "date-fns/locale/en-US"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { supabase } from "../supabase"
import AdminLayout from "../components/layout/AdminLayout"
import { Plus, X, Loader2, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import Toast from "../components/Toast"

const locales = {
    "en-US": enUS,
}

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
})

export default function CalendarPage() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [newEvent, setNewEvent] = useState({
        title: "",
        start: "",
        end: "",
        description: "",
    })
    const [toast, setToast] = useState({ message: "", type: "" })

    const showToast = (message, type) => {
        setToast({ message, type })
    }

    const closeToast = () => {
        setToast({ message: "", type: "" })
    }

    useEffect(() => {
        checkRole()
        fetchEvents()
    }, [])

    const checkRole = () => {
        const role = sessionStorage.getItem("role")
        setIsAdmin(role === "admin")
    }

    const fetchEvents = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase.from("calendar_events").select("*")

            if (error) {
                console.error("Error fetching events:", error)
                if (error.code === '42P01') { // undefined_table
                    showToast("Calendar table not found. Please ask admin to setup database.", "error")
                }
                return
            }

            if (data) {
                const formattedEvents = data.map((event) => ({
                    id: event.id,
                    title: event.title,
                    start: new Date(event.start_time),
                    end: new Date(event.end_time),
                    description: event.description,
                    allDay: event.all_day || false
                }))
                setEvents(formattedEvents)
            }
        } catch (err) {
            console.error("Unexpected error:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleAddEvent = async (e) => {
        e.preventDefault()
        if (!newEvent.title || !newEvent.start || !newEvent.end) {
            showToast("Please fill in all required fields", "error")
            return
        }

        try {
            const { data, error } = await supabase
                .from("calendar_events")
                .insert([
                    {
                        title: newEvent.title,
                        start_time: newEvent.start,
                        end_time: newEvent.end,
                        description: newEvent.description,
                        created_by: sessionStorage.getItem("username"),
                        all_day: false
                    },
                ])
                .select()

            if (error) throw error

            if (data) {
                setEvents([
                    ...events,
                    {
                        id: data[0].id,
                        title: data[0].title,
                        start: new Date(data[0].start_time),
                        end: new Date(data[0].end_time),
                        description: data[0].description,
                        allDay: data[0].all_day
                    },
                ])
                showToast("Event added successfully", "success")
                setIsModalOpen(false)
                setNewEvent({ title: "", start: "", end: "", description: "" })
            }
        } catch (error) {
            console.error("Error adding event:", error)
            showToast("Failed to add event: " + error.message, "error")
        }
    }

    const handleDeleteEvent = async (eventId) => {
        if (!isAdmin) return
        if (!window.confirm("Are you sure you want to delete this event?")) return

        try {
            const { error } = await supabase
                .from("calendar_events")
                .delete()
                .eq("id", eventId)

            if (error) throw error

            setEvents(events.filter((e) => e.id !== eventId))
            showToast("Event deleted successfully", "success")
        } catch (error) {
            console.error("Error deleting event:", error)
            showToast("Failed to delete event", "error")
        }
    }

    const handleSelectSlot = ({ start, end }) => {
        if (!isAdmin) return
        setNewEvent({
            ...newEvent,
            start: format(start, "yyyy-MM-dd'T'HH:mm"),
            end: format(end, "yyyy-MM-dd'T'HH:mm"),
        })
        setIsModalOpen(true)
    }

    const handleSelectEvent = (event) => {
        if (isAdmin) {
            if (window.confirm(`Delete event "${event.title}"?`)) {
                handleDeleteEvent(event.id)
            }
        } else {
            alert(`${event.title}\n${event.description || ''}\n${format(event.start, 'PPpp')} - ${format(event.end, 'PPpp')}`)
        }
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

    const CustomToolbar = (props) => {
        const { date } = props

        const navigate = (action) => {
            props.onNavigate(action)
        }

        const handleMonthChange = (event) => {
            const newDate = new Date(date)
            newDate.setMonth(parseInt(event.target.value, 10))
            props.onNavigate('DATE', newDate)
        }

        const handleYearChange = (event) => {
            const newDate = new Date(date)
            newDate.setFullYear(parseInt(event.target.value, 10))
            props.onNavigate('DATE', newDate)
        }

        // Generate years range
        const currentYear = new Date().getFullYear()
        const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i)

        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ]

        return (
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 bg-white p-1 rounded-lg">
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('PREV')}
                        className="p-2 hover:bg-red-50 text-gray-600 hover:text-[#991B1B] rounded-lg transition-colors"
                        title="Previous"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => navigate('TODAY')}
                        className="px-4 py-2 text-sm font-medium text-[#991B1B] bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={() => navigate('NEXT')}
                        className="p-2 hover:bg-red-50 text-gray-600 hover:text-[#991B1B] rounded-lg transition-colors"
                        title="Next"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex gap-3 items-center">
                    <div className="relative">
                        <select
                            value={date.getMonth()}
                            onChange={handleMonthChange}
                            className="appearance-none bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-[#991B1B] focus:border-[#991B1B] block w-32 p-2.5 pr-8 font-medium cursor-pointer hover:border-[#991B1B] transition-colors"
                        >
                            {months.map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                            <ChevronDown className="h-4 w-4" />
                        </div>
                    </div>

                    <div className="relative">
                        <select
                            value={date.getFullYear()}
                            onChange={handleYearChange}
                            className="appearance-none bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-[#991B1B] focus:border-[#991B1B] block w-24 p-2.5 pr-8 font-medium cursor-pointer hover:border-[#991B1B] transition-colors"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                            <ChevronDown className="h-4 w-4" />
                        </div>
                    </div>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {['month', 'week', 'day', 'agenda'].map(view => (
                        <button
                            key={view}
                            onClick={() => props.onView(view)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${props.view === view
                                ? 'bg-white text-[#991B1B] shadow-sm ring-1 ring-black/5'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                                }`}
                        >
                            {view}
                        </button>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <AdminLayout>
            <div className="max-w-[1400px] mx-auto p-6 lg:p-10 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
                            Calendar
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage upcoming events and schedules
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#991B1B] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#7f1616] transition-all active:scale-95"
                        >
                            <Plus className="h-4 w-4" />
                            Add Event
                        </button>
                    )}
                </div>

                {/* Calendar Container */}
                <div className="h-[750px] bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: "100%" }}
                        selectable={isAdmin}
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={handleSelectEvent}
                        views={['month', 'week', 'day', 'agenda']}
                        components={{
                            toolbar: CustomToolbar
                        }}
                        eventPropGetter={(event) => ({
                            style: {
                                backgroundColor: '#FEF2F2', // red-50
                                color: '#991B1B', // red-800
                                border: '1px solid #FECACA', // red-200
                                borderLeft: '3px solid #991B1B',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '0.8rem',
                                fontWeight: 600
                            }
                        })}
                    />
                </div>

                {/* Add Event Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                            <div className="flex justify-between items-center p-5 border-b border-gray-100">
                                <h2 className="text-lg font-semibold text-gray-900">New Event</h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleAddEvent} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newEvent.title}
                                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                        className="w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#991B1B] focus:bg-white focus:ring-1 focus:ring-[#991B1B] transition-all"
                                        placeholder="Meeting title"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                            Starts
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={newEvent.start}
                                            onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                                            className="w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#991B1B] focus:bg-white focus:ring-1 focus:ring-[#991B1B] transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                            Ends
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={newEvent.end}
                                            onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                                            className="w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#991B1B] focus:bg-white focus:ring-1 focus:ring-[#991B1B] transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Description
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={newEvent.description}
                                        onChange={(e) =>
                                            setNewEvent({ ...newEvent, description: e.target.value })
                                        }
                                        className="w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#991B1B] focus:bg-white focus:ring-1 focus:ring-[#991B1B] transition-all resize-none"
                                        placeholder="Add details..."
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-lg px-6 py-2.5 text-sm font-medium text-white bg-[#991B1B] hover:bg-[#7f1616] shadow-sm transition-all active:scale-95"
                                    >
                                        Create Event
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Toast Component */}
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={closeToast}
                />
            </div>
        </AdminLayout>
    )
}
