import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

export function useIdleLogout() {
  const logout = useAuthStore((state) => state.logout);
  const token = useAuthStore((state) => state.token);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (token) {
      timeoutRef.current = setTimeout(() => {
        logout();
        window.location.href = '/login';
      }, IDLE_TIMEOUT_MS);
    }
  }, [logout, token]);

  useEffect(() => {
    // Events that represent user activity
    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
    ];

    const handleActivity = () => {
      resetTimer();
    };

    if (token) {
      // Set the initial timer
      resetTimer();

      // Attach event listeners
      events.forEach((event) => {
        window.addEventListener(event, handleActivity);
      });
    }

    // Cleanup phase
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer, token]);
}
