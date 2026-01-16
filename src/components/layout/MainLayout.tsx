import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import FabUserContact from '@/components/common/FabUserContact';

export function MainLayout() {
  const isMobile = useIsMobile();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {!isMobile && <AppSidebar />}
        <div className="flex-1 flex flex-col">
          <AppHeader />
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
          {isMobile && <FabUserContact />}
        </div>
      </div>
    </SidebarProvider>
  );
}
