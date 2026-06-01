import React, { createContext, useContext, useState, useCallback } from 'react';
import { ScanResult, PhotoCandidate } from '../types';

interface ScanContextValue {
  scanResult: ScanResult | null;
  setScanResult: (result: ScanResult) => void;
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  addCandidate: (candidate: PhotoCandidate) => void;
  removeSelected: (id: string) => void;
  clearAll: () => void;
}

const ScanContext = createContext<ScanContextValue | null>(null);

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [scanResult, setScanResultState] = useState<ScanResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const setScanResult = useCallback((result: ScanResult) => {
    setScanResultState(result);
    setSelectedIds(new Set(result.selected));
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addCandidate = useCallback((candidate: PhotoCandidate) => {
    setScanResultState(prev => {
      if (!prev) return prev;
      const exists = prev.candidates.some(
        c => c.localIdentifier === candidate.localIdentifier
      );
      if (exists) return prev;
      return { ...prev, candidates: [...prev.candidates, candidate] };
    });
    setSelectedIds(prev => new Set([...prev, candidate.localIdentifier]));
  }, []);

  const removeSelected = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setScanResultState(null);
    setSelectedIds(new Set());
  }, []);

  return (
    <ScanContext.Provider
      value={{ scanResult, setScanResult, selectedIds, toggleSelected, addCandidate, removeSelected, clearAll }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScan(): ScanContextValue {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used within ScanProvider');
  return ctx;
}
