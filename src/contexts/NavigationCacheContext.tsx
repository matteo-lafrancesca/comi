'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { RepasWithIngredients, ProgrammationWithRepas, CategoryGroup, ShoppingListExtraItem } from '@/types';
import { useSettings } from './SettingsContext';

export interface RepasCache {
  repasList: RepasWithIngredients[];
  page: number;
  hasMore: boolean;
  searchQuery: string;
  sortBy: string;
  isLoaded: boolean;
  scrollPosition: number;
}

export interface PlanificationCache {
  programmations: ProgrammationWithRepas[];
  currentWeek: number | null;
  currentYear: number | null;
  weekInfo: { start: string; end: string } | null;
  isLoaded: boolean;
  key: string;
  scrollPosition: number;
  hasInitialScrolled: boolean;
}

export interface CoursesCache {
  categories: CategoryGroup[];
  extras: ShoppingListExtraItem[];
  currentWeek: number | null;
  currentYear: number | null;
  isLoaded: boolean;
  key: string;
}

interface NavigationCacheContextType {
  repasCache: RepasCache;
  planificationCache: PlanificationCache;
  coursesCache: CoursesCache;
  updateRepasCache: (updates: Partial<RepasCache>) => void;
  updatePlanificationCache: (updates: Partial<PlanificationCache>) => void;
  updateCoursesCache: (updates: Partial<CoursesCache>) => void;
  invalidateRepasCache: () => void;
  invalidatePlanningAndCourses: () => void;
  invalidateCoursesCache: () => void;
  invalidateAllCaches: () => void;
}

const initialRepasCache: RepasCache = {
  repasList: [],
  page: 1,
  hasMore: true,
  searchQuery: '',
  sortBy: 'date_creation',
  isLoaded: false,
  scrollPosition: 0,
};

const initialPlanificationCache: PlanificationCache = {
  programmations: [],
  currentWeek: null,
  currentYear: null,
  weekInfo: null,
  isLoaded: false,
  key: '',
  scrollPosition: 0,
  hasInitialScrolled: false,
};

const initialCoursesCache: CoursesCache = {
  categories: [],
  extras: [],
  currentWeek: null,
  currentYear: null,
  isLoaded: false,
  key: '',
};

const NavigationCacheContext = createContext<NavigationCacheContextType | undefined>(undefined);

export function NavigationCacheProvider({ children }: { children: React.ReactNode }) {
  const [repasCache, setRepasCache] = useState<RepasCache>(initialRepasCache);
  const [planificationCache, setPlanificationCache] = useState<PlanificationCache>(initialPlanificationCache);
  const [coursesCache, setCoursesCache] = useState<CoursesCache>(initialCoursesCache);

  const { weekStartDay } = useSettings();

  // Invalider planification & courses si le jour de début de semaine change
  const [prevWeekStartDay, setPrevWeekStartDay] = useState(weekStartDay);
  if (prevWeekStartDay !== weekStartDay) {
    setPrevWeekStartDay(weekStartDay);
    setPlanificationCache(initialPlanificationCache);
    setCoursesCache(initialCoursesCache);
  }

  const updateRepasCache = useCallback((updates: Partial<RepasCache>) => {
    setRepasCache((prev) => ({ ...prev, ...updates }));
  }, []);

  const updatePlanificationCache = useCallback((updates: Partial<PlanificationCache>) => {
    setPlanificationCache((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateCoursesCache = useCallback((updates: Partial<CoursesCache>) => {
    setCoursesCache((prev) => ({ ...prev, ...updates }));
  }, []);

  const invalidateRepasCache = useCallback(() => {
    setRepasCache(initialRepasCache);
  }, []);

  const invalidatePlanningAndCourses = useCallback(() => {
    setPlanificationCache(initialPlanificationCache);
    setCoursesCache(initialCoursesCache);
  }, []);

  const invalidateCoursesCache = useCallback(() => {
    setCoursesCache(initialCoursesCache);
  }, []);

  const invalidateAllCaches = useCallback(() => {
    setRepasCache(initialRepasCache);
    setPlanificationCache(initialPlanificationCache);
    setCoursesCache(initialCoursesCache);
  }, []);

  return (
    <NavigationCacheContext.Provider
      value={{
        repasCache,
        planificationCache,
        coursesCache,
        updateRepasCache,
        updatePlanificationCache,
        updateCoursesCache,
        invalidateRepasCache,
        invalidatePlanningAndCourses,
        invalidateCoursesCache,
        invalidateAllCaches,
      }}
    >
      {children}
    </NavigationCacheContext.Provider>
  );
}

export function useNavigationCache() {
  const context = useContext(NavigationCacheContext);
  if (context === undefined) {
    throw new Error('useNavigationCache must be used within a NavigationCacheProvider');
  }
  return context;
}
