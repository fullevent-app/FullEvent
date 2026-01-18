
import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
    // Initialize state with initialValue.
    // We only access localStorage on mount to avoid hydration mismatch.
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        try {
            const item = window.localStorage.getItem(key);
            if (item) {
                setStoredValue(JSON.parse(item));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setInitialized(true);
        }
    }, [key]);

    const setValue = (value: T) => {
        try {
            // Allow value to be a function so we have same API as useState
            const valueToStore =
                value instanceof Function ? value(storedValue) : value;

            setStoredValue(valueToStore);

            if (typeof window !== "undefined") {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error(error);
        }
    };

    return [storedValue, setValue];
}
