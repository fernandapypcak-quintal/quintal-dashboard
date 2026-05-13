// src/hooks/useLabels.jsx
import { createContext, useContext, useState } from 'react';

const LabelsContext = createContext(null);

export function LabelsProvider({ children }) {
  const [showLabels, setShowLabels] = useState(false);
  const toggleLabels = () => setShowLabels(v => !v);
  return (
    <LabelsContext.Provider value={{ showLabels, toggleLabels }}>
      {children}
    </LabelsContext.Provider>
  );
}

export function useLabels() {
  const ctx = useContext(LabelsContext);
  if (!ctx) throw new Error('useLabels must be used within LabelsProvider');
  return ctx;
}
