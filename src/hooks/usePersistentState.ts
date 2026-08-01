import React, { useState, useEffect, useCallback, useRef } from "react";
import { getAll, save, saveMany, StoreName, generateUUID } from "../lib/db";
import { registerEvent } from "../lib/db";

type SetStateAction<T> = T | ((prev: T) => T);

export function usePersistentState<T extends { id: string }>(
  storeName: StoreName,
  initialValue: T[]
): [T[], React.Dispatch<React.SetStateAction<T[]>>] {
  const [data, setData] = useState<T[]>(initialValue);
  const loadedRef = useRef(false);
  const pendingRef = useRef<SetStateAction<T[]> | null>(null);

  // Load from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await getAll<T>(storeName);
        if (cancelled) return;
        if (stored.length > 0) {
          setData(stored as T[]);
        } else if (initialValue.length > 0) {
          // Seed initial data if store is empty
          await saveMany(storeName, initialValue);
          registerEvent(`Base de datos '${storeName}' inicializada`, "sistema");
        }
      } catch (err) {
        console.error(`Error loading ${storeName} from IndexedDB:`, err);
      } finally {
        loadedRef.current = true;
      }
    })();
    return () => { cancelled = true; };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeName]);

  // Save to IndexedDB on every change
  useEffect(() => {
    if (!loadedRef.current) return;
    (async () => {
      try {
        const currentData = data;
        // Batch save all items
        await saveMany(storeName, currentData);
      } catch (err) {
        console.error(`Error saving ${storeName} to IndexedDB:`, err);
      }
    })();
  }, [data, storeName]);

  return [data, setData];
}

export function usePersistentSingle<T extends object>(
  storeName: StoreName,
  id: string,
  initialValue: T
): [T, (val: Partial<T> | T) => void] {
  const [data, setData] = useState<T>(initialValue);
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const all = await getAll<T>(storeName);
        if (all.length > 0) {
          // For settings store, take first item as singleton
          const first = all[0];
          setData({ ...initialValue, ...first } as T);
        }
      } catch (err) {
        console.error(`Error loading ${storeName}:`, err);
      } finally {
        loadedRef.current = true;
      }
    })();
  }, [storeName, id]);

  const update = useCallback(
    async (val: Partial<T> | T) => {
      // El store usa keyPath "id": se fuerza el id singleton al guardar.
      const newData = { ...data, ...val } as T & { id: string };
      newData.id = id;
      setData(newData);
      if (loadedRef.current) {
        try {
          await save(storeName, newData);
        } catch (err) {
          console.error(`Error saving ${storeName}:`, err);
        }
      }
    },
    [data, storeName, id]
  );

  return [data, update];
}