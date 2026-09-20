import { createContext, useContext, useState, useCallback } from 'react';
import { getMyFamily, getFamily } from '../api/family.api';
import { getMembers } from '../api/members.api';

const FamilyContext = createContext(null);

export function FamilyProvider({ children }) {
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Loads family profile & roster.
   * If familyId is passed (e.g. by officer), calls /families/:id.
   * Otherwise (citizen default), calls GET /api/families/me.
   */
  const loadFamily = useCallback(async (familyId) => {
    setLoading(true);
    setError(null);
    try {
      let famData;
      let memData;

      if (familyId) {
        const [famRes, memRes] = await Promise.all([
          getFamily(familyId),
          getMembers(familyId),
        ]);
        famData = famRes.data;
        memData = memRes.data || famRes.data.members || [];
      } else {
        // Authenticated citizen: securely fetch via GET /api/families/me
        const res = await getMyFamily();
        famData = res.data;
        memData = res.data.members || [];
      }

      setFamily(famData);
      setMembers(memData);
      return famData;
    } catch (err) {
      if (err.response?.status === 404) {
        // Normal empty state when citizen has not enrolled a household yet
        setFamily(null);
        setMembers([]);
      } else {
        setError(err.clientMessage || err.response?.data?.message || 'Failed to load family data');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearFamily = useCallback(() => {
    setFamily(null);
    setMembers([]);
    setError(null);
  }, []);

  return (
    <FamilyContext.Provider
      value={{
        family,
        members,
        loading,
        error,
        setError,
        loadFamily,
        clearFamily,
        setFamily,
        setMembers,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamily must be used inside <FamilyProvider>');
  return ctx;
}
