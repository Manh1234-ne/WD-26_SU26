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

    const handleBeforeUnload = () => {
      console.log(`[UnloadGuard] Reload/unloaded for booking ${bookingIdRef.current}`);
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
