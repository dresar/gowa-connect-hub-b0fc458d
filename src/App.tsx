import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LogProvider } from "@/contexts/LogContext";
import { MainLayout } from "@/components/layout/MainLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import DeviceManagerPage from "@/pages/DeviceManagerPage";
import ChatExplorerPage from "@/pages/ChatExplorerPage";
import SendCenterPage from "@/pages/SendCenterPage";
import BulkMessagingPage from "@/pages/BulkMessagingPage";
import GroupManagementPage from "@/pages/GroupManagementPage";
import UserContactPage from "@/pages/UserContactPage";
import NewsletterPage from "@/pages/NewsletterPage";
import WebhookLogsPage from "@/pages/WebhookLogsPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <LogProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<MainLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/devices" element={<DeviceManagerPage />} />
                <Route path="/chats" element={<ChatExplorerPage />} />
                <Route path="/send" element={<SendCenterPage />} />
                <Route path="/bulk" element={<BulkMessagingPage />} />
                <Route path="/groups" element={<GroupManagementPage />} />
                <Route path="/user" element={<UserContactPage />} />
                <Route path="/newsletter" element={<NewsletterPage />} />
                <Route path="/logs" element={<WebhookLogsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </LogProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
