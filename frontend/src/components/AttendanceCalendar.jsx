import { useState, useMemo } from "react"

const statusColors = {
  full_day: "bg-emerald-500 text-white",
  half_day: "bg-amber-500 text-white",
  absent: "bg-red-500 text-white",
  holiday: "bg-blue-500 text-white",
  holiday_work: "bg-purple-500 text-white",
  comp_off_leave: "bg-indigo-500 text-white",
}

export default function AttendanceCalendar({ records, holidays, currentDate, selectedDate = null, onSelectDate = null }) {
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()
    
    // Adjust for Monday start if needed, but Sunday is default
    return { firstDay, totalDays, year, month }
  }, [currentDate])

  const calendarData = useMemo(() => {
    const data = {}
    
    // Map holidays
    holidays.forEach(h => {
      data[h.date] = { type: "holiday", label: h.name }
    })
    
    // Map records (overwrites holidays if worked)
    records.forEach(r => {
      data[r.date] = { type: r.day_status, label: r.day_status }
    })
    
    return data
  }, [records, holidays])

  const days = []
  // Empty slots for first week
  for (let i = 0; i < daysInMonth.firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-10 sm:h-14" />)
  }

  const getISTTodayStr = () => {
    const options = {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    };
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(new Date());
    const partMap = {};
    parts.forEach(p => partMap[p.type] = p.value);
    const year = parseInt(partMap.year, 10);
    const month = parseInt(partMap.month, 10);
    const day = parseInt(partMap.day, 10);
    const pad = (num) => String(num).padStart(2, "0");
    return `${year}-${pad(month)}-${pad(day)}`;
  };
  const today = getISTTodayStr()

  for (let d = 1; d <= daysInMonth.totalDays; d++) {
    const dateStr = `${daysInMonth.year}-${String(daysInMonth.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    const info = calendarData[dateStr]
    const isToday = dateStr === today
    const isSelected = dateStr === selectedDate
    
    // Check if this calendar day is a Sunday (getDay === 0)
    const isSunday = new Date(daysInMonth.year, daysInMonth.month, d).getDay() === 0
    let dayInfo = info
    if (!dayInfo && isSunday) {
      dayInfo = { type: "holiday", label: "Sunday" }
    }
    
    let cellStyle = ""
    if (isSelected) {
      if (dayInfo) {
        cellStyle = `${statusColors[dayInfo.type]} ring-2 ring-emerald-600 ring-offset-2 z-10`
      } else {
        cellStyle = "border-2 border-emerald-500 bg-emerald-50/30 text-emerald-700 z-10"
      }
    } else {
      cellStyle = dayInfo ? statusColors[dayInfo.type] : "bg-white text-gray-700 border border-gray-100 hover:bg-gray-50"
    }

    days.push(
      <button 
        key={d} 
        type="button"
        onClick={() => onSelectDate?.(dateStr)}
        className={`relative h-10 sm:h-14 flex flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 outline-none
          ${cellStyle}
          ${isToday && !isSelected ? "ring-2 ring-emerald-600 ring-offset-2" : ""}
        `}
      >
        <span>{d}</span>
        {dayInfo?.type === "holiday" && (
          <div className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-white/60" />
        )}
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days}
      </div>

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
        {[
          { label: "Present", color: "bg-emerald-500" },
          { label: "Half Day", color: "bg-amber-500" },
          { label: "Absent", color: "bg-red-500" },
          { label: "Holiday", color: "bg-blue-500" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${l.color}`} />
            <span className="text-[10px] font-bold text-gray-500 uppercase">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
