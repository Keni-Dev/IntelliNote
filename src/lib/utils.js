/**
 * Utility function to merge Tailwind CSS classes
 * Combines multiple class strings and removes duplicates
 * 
 * @param {...string} classes - Class strings to merge
 * @returns {string} Merged class string
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
