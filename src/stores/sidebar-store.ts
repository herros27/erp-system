import { create } from 'zustand'

interface SidebarState {
  isCollapsed: boolean
  isMobileOpen: boolean
  toggle: () => void
  setCollapsed: (v: boolean) => void
  setMobileOpen: (v: boolean) => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  isMobileOpen: false,
  toggle: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
  setCollapsed: (v) => set({ isCollapsed: v }),
  setMobileOpen: (v) => set({ isMobileOpen: v }),
}))
