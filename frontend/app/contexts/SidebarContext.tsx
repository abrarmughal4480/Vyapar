'use client'
import { createContext, useContext } from 'react'

export const SidebarContext = createContext({ 
  isCollapsed: false, 
  setIsCollapsed: (v: boolean) => {},
  isMobileSidebarOpen: false,
  setIsMobileSidebarOpen: (v: boolean) => {}
})

export const useSidebar = () => useContext(SidebarContext) 