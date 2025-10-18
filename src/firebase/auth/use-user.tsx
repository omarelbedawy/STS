
'use client';

import { useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useAuth } from '../provider';

interface UseUserState {
  user: User | null;
  loading: boolean;
  claims: any | null;
}

export function useUser(): UseUserState {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<any | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const idTokenResult = await user.getIdTokenResult();
        setClaims(idTokenResult.claims);
      } else {
        setClaims(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  return { user, loading, claims };
}
