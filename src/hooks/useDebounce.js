import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing values
 * Delays updating the returned value until after the specified delay
 * Useful for search inputs to reduce API calls or expensive computations
 * 
 * @param {*} value - The value to debounce
 * @param {number} delay - The delay in milliseconds (default: 500ms)
 * @returns {*} The debounced value
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 * 
 * useEffect(() => {
 *   // This will only run 300ms after the user stops typing
 *   performSearch(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 */
function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay expires
    // This prevents the debounced value from updating too frequently
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Re-run effect when value or delay changes

  return debouncedValue;
}

export default useDebounce;
