import { useStore } from 'zustand';

// Define a Zustand store
const useSidebarStore = create(
  (set) => ({
    isSidebarOpen: false,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen }))
  })
);

function ClientPage() {
  const isSidebarOpen = useStore(useSidebarStore, (state) => state.isSidebarOpen);
  const toggleSidebar = useStore(useSidebarStore, (state) => state.toggleSidebar);

  // ... use isSidebarOpen and toggleSidebar
}