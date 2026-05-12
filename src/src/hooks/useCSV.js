// src/hooks/useCSV.js
// Use this hook to load real CSV data
// Replace rawData in mockData.js with the result of this hook

import { useState, useEffect } from 'react';
import Papa from 'papaparse';

export function useCSV(url) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) { setLoading(false); return; }

    Papa.parse(url, {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        setData(results.data);
        setLoading(false);
      },
      error: (err) => {
        setError(err);
        setLoading(false);
      },
    });
  }, [url]);

  return { data, loading, error };
}

// To use with a local CSV file upload:
export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: reject,
    });
  });
}
