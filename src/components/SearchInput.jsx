import { useEffect, useState } from 'react';

// Self-contained debounced search box. Keeps per-keystroke state LOCAL so typing
// never re-renders the parent (the whole admin cabinet); it only pushes the
// debounced value up via onSearch. `onSearch` must be a stable reference.
export default function SearchInput({ onSearch, placeholder }) {
  const [value, setValue] = useState('');
  useEffect(() => {
    const id = setTimeout(() => onSearch(value.trim()), 300);
    return () => clearTimeout(id);
  }, [value, onSearch]);
  return (
    <input
      className="app-filters__search"
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
