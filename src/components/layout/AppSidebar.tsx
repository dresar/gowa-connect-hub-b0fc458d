import { 
  LayoutDashboard, 
  Smartphone, 
  MessageCircle, 
  Send, 
  Users, 
  User, 
  Newspaper, 
  Activity, 
  Settings,
  MessageSquare,
  UsersRound
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Device Manager', url: '/devices', icon: Smartphone },
  { title: 'Chat Explorer', url: '/chats', icon: MessageCircle },
  { title: 'Send Center', url: '/send', icon: Send },
  { title: 'Auto Reply', url: '/auto-reply', icon: MessageSquare },
  { title: 'Bulk Messaging', url: '/bulk', icon: UsersRound },
  { title: 'Group Management', url: '/groups', icon: Users },
  { title: 'Newsletter', url: '/newsletter', icon: Newspaper },
  { title: 'Webhook & Logs', url: '/logs', icon: Activity },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-6 h-6 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-lg text-foreground truncate">GOWA</h1>
              <p className="text-xs text-muted-foreground truncate">Control Panel</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <NavLink 
                        to={item.url} 
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          isActive 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-accent text-foreground'
                        }`}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
