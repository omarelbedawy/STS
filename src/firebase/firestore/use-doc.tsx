
'use client';

import React, { useState, useEffect } from 'react';
import { onSnapshot, doc, DocumentReference, DocumentData } from 'firebase/firestore';
import { useFirestore } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '../errors';

interface UseDocState<T> {
  data: T | null;
  loading: boolean;
}

export function useDoc<T>(path: string): UseDocState<T>;
export function useDoc<T>(ref: DocumentReference | null): UseDocState<T>;
export function useDoc<T>(pathOrRef: string | DocumentReference | null): UseDocState<T> {
  const firestore = useFirestore();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Do not run if firestore is not yet available.
    if (!firestore || !pathOrRef) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = typeof pathOrRef === 'string' ? doc(firestore, pathOrRef) : pathOrRef;
    
    const unsubscribe = onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        setData({ uid: docSnap.id, ...docSnap.data() } as T);
      } else {
        setData(null);
      }
      setLoading(false);
    }, (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: ref.path,
        operation: 'get',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      setData(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathOrRef, firestore]);

  return { data, loading };
}

export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(factory, deps);
}
