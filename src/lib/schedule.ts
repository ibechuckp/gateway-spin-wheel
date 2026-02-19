/**
 * Check if current time is within schedule
 */
export function isWithinSchedule(
  scheduleStart: string | null,
  scheduleEnd: string | null,
  timezone: string = 'America/New_York'
): { available: boolean; nextAvailable: string | null } {
  // If no schedule set, always available
  if (!scheduleStart || !scheduleEnd) {
    return { available: true, nextAvailable: null }
  }

  try {
    // Get current time in the specified timezone
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const currentTime = formatter.format(now)
    
    // Parse times as minutes since midnight for comparison
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number)
      return h * 60 + m
    }
    
    const currentMinutes = toMinutes(currentTime)
    const startMinutes = toMinutes(scheduleStart)
    const endMinutes = toMinutes(scheduleEnd)
    
    // Handle schedules that cross midnight (e.g., 22:00 - 02:00)
    let available: boolean
    if (startMinutes <= endMinutes) {
      // Normal schedule (e.g., 10:00 - 22:00)
      available = currentMinutes >= startMinutes && currentMinutes < endMinutes
    } else {
      // Crosses midnight (e.g., 22:00 - 02:00)
      available = currentMinutes >= startMinutes || currentMinutes < endMinutes
    }
    
    // Format next available time
    const formatTime = (time: string) => {
      const [h, m] = time.split(':').map(Number)
      const period = h >= 12 ? 'PM' : 'AM'
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
    }
    
    return {
      available,
      nextAvailable: available ? null : formatTime(scheduleStart)
    }
  } catch (error) {
    console.error('Schedule check error:', error)
    // On error, default to available
    return { available: true, nextAvailable: null }
  }
}
