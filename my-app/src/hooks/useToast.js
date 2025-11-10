import { useState, useCallback, useRef } from "react";

let globalToastCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const toastTimeoutsRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    // Clear timeout if exists
    const timeout = toastTimeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      toastTimeoutsRef.current.delete(id);
    }

    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      type = "info",
      title,
      message,
      duration = 4000,
      action,
      persistent = false,
    }) => {
      const id = ++globalToastCounter;

      const toast = {
        id,
        type,
        title,
        message,
        duration,
        action,
        persistent,
      };

      setToasts((prev) => [...prev, toast]);

      // Auto remove after duration if not persistent
      if (!persistent && duration > 0) {
        const timeout = setTimeout(() => {
          removeToast(id);
        }, duration);
        toastTimeoutsRef.current.set(id, timeout);
      }

      return id;
    },
    [removeToast]
  );

  const success = useCallback(
    (message, options = {}) => {
      return showToast({
        type: "success",
        message,
        ...options,
      });
    },
    [showToast]
  );

  const error = useCallback(
    (message, options = {}) => {
      return showToast({
        type: "error",
        message,
        duration: 6000, // Longer for errors
        ...options,
      });
    },
    [showToast]
  );

  const warning = useCallback(
    (message, options = {}) => {
      return showToast({
        type: "warning",
        message,
        duration: 5000,
        ...options,
      });
    },
    [showToast]
  );

  const info = useCallback(
    (message, options = {}) => {
      return showToast({
        type: "info",
        message,
        ...options,
      });
    },
    [showToast]
  );

  const clearAll = useCallback(() => {
    // Clear all timeouts
    toastTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    toastTimeoutsRef.current.clear();
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    success,
    error,
    warning,
    info,
    removeToast,
    clearAll,
  };
}
