'use client';

import { createContext, ReactNode, useCallback, useContext, useMemo, useRef } from 'react';

type SearchStateMap = Record<string, unknown>;

interface ServerSearchStateContextValue {
  getState: <T>(key: string) => T | null;
  setState: <T>(key: string, value: T) => void;
  clearState: (key: string) => void;
}

const ServerSearchStateContext = createContext<ServerSearchStateContextValue | null>(null);

export function ServerSearchStateProvider({ children }: { children: ReactNode }) {
  const stateMapRef = useRef<SearchStateMap>({});

  const getState = useCallback(<T,>(key: string) => {
    if (!(key in stateMapRef.current)) {
      return null as T | null;
    }

    return stateMapRef.current[key] as T;
  }, []);

  const setState = useCallback(<T,>(key: string, value: T) => {
    stateMapRef.current[key] = value as unknown;
  }, []);

  const clearState = useCallback((key: string) => {
    if (!(key in stateMapRef.current)) {
      return;
    }

    delete stateMapRef.current[key];
  }, []);

  const value = useMemo<ServerSearchStateContextValue>(
    () => ({
      getState,
      setState,
      clearState,
    }),
    [getState, setState, clearState],
  );

  return (
    <ServerSearchStateContext.Provider value={value}>{children}</ServerSearchStateContext.Provider>
  );
}

export function useServerSearchState() {
  const context = useContext(ServerSearchStateContext);

  if (!context) {
    return {
      getState: <T,>(_key: string) => null as T | null,
      setState: <T,>(_key: string, _value: T) => {},
      clearState: (_key: string) => {},
    };
  }

  return context;
}
