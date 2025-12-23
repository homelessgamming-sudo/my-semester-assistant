import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export function useFirestoreData<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const { user } = useAuth();
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  // Load data from Firestore on mount and subscribe to changes
  useEffect(() => {
    if (!user) {
      setData(initialValue);
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'userData', user.uid, 'data', key);
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setData(docSnap.data().value as T);
      } else {
        setData(initialValue);
      }
      setLoading(false);
    }, (error) => {
      console.error(`Error loading ${key}:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, key]);

  // Save data to Firestore
  const saveData = useCallback(async (newValue: T | ((prev: T) => T)) => {
    const resolvedValue = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(data) 
      : newValue;
    
    setData(resolvedValue);

    if (!user) return;

    try {
      const docRef = doc(db, 'userData', user.uid, 'data', key);
      await setDoc(docRef, { value: resolvedValue, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
    }
  }, [user, key, data]);

  return [data, saveData, loading];
}
