import { useEffect, useRef } from "react";
/**
* @param bookingId   
* @param isActive    
*/
export function useBookingUnloadGuard(
  bookingId: string | null | undefined,
  isActive: boolean
) {
  const bookingIdRef = useRef(bookingId);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    bookingIdRef.current = bookingId;
  }, [bookingId]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!bookingId || !isActive) return;
    const apiBase =
      (import.meta.env.VITE_API_URL as string | undefined) ||
      `${window.location.origin}/api`;

    const sendCancel = (id: string) => {
      const url = `${apiBase}/bookings/${id}/cancel-beacon`;
      const token = localStorage.getItem("cinema_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      try {
        fetch(url, {
          method: "POST",
          headers,
          keepalive: true,
          body: JSON.stringify({}),
        }).catch(() => {
          if (typeof navigator.sendBeacon === "function") {
            const blob = new Blob([JSON.stringify({})], {
              type: "application/json",
            });
            navigator.sendBeacon(url, blob);
          }
        });
      } catch {
        if (typeof navigator.sendBeacon === "function") {
          const blob = new Blob([JSON.stringify({})], {
            type: "application/json",
          });
          navigator.sendBeacon(url, blob);
        }
      }
    };

    const handleBeforeUnload = () => {
      const id = bookingIdRef.current;
      const active = isActiveRef.current;
      if (id && active) {
        console.log(
          `[UnloadGuard] beforeunload – gửi cancel-beacon cho booking ${id}`
        );
        sendCancel(id);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        console.log(
          `[UnloadGuard] Tab ẩn (booking ${bookingIdRef.current}) – backend cron job sẽ xử lý nếu hết hạn`
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [bookingId, isActive]);
}
