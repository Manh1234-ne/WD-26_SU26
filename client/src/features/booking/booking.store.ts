import { create } from "zustand"
import type { Booking, User } from "./booking.types"
import { getBookingsByUser, completeBooking } from "./booking.service"

type BookingState = {
    bookings: Booking[]
    user: User | null
    setBookings: (bookings: Booking[]) => void
    setUser: (user: User) => void
    refetchBookings: () => Promise<void>
    handleCompleteBooking: (id: string) => Promise<void>
}

export const useBooking = create<BookingState>((set, get) => ({
    bookings: [],
    user: null,
    setBookings: (bookings) => set({ bookings }),
    setUser: (user) => set({ user }),
    refetchBookings: async () => {
        const user = get().user
        if (!user) return
        const response = await getBookingsByUser(user._id)
        set({ bookings: response.data })
    },
    handleCompleteBooking: async (id) => {
        await completeBooking(id)
        get().refetchBookings()
    },
}))