import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChannelAnalyzer from "./pages/ChannelAnalyzer";
import TrendFinder from "./pages/TrendFinder";
import ContentCalendar from "./pages/ContentCalendar";
import Overview from "./pages/Overview";
import Production from "./pages/Production";
import VideoProductionSuite from "./pages/VideoProductionSuite";
import Planner from "./pages/Planner";
import NotFound from "./pages/NotFound";

// Shared React Query client for the entire app lifecycle.
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* Global UI helpers live at the app root so pages don't have to wire them up. */}
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* Primary routes */}
          <Route path="/" element={<ChannelAnalyzer />} />
          <Route path="/channel-analyzer" element={<ChannelAnalyzer />} />
          <Route path="/trend-finder" element={<TrendFinder />} />
          <Route path="/content-calendar" element={<ContentCalendar />} />
          <Route path="/planner" element={<Planner />} />

          {/* Production flow */}
          <Route path="/overview" element={<Overview />} />
          <Route path="/video-production" element={<Overview />} />
          <Route path="/production" element={<Production />} />
          <Route path="/production/:videoId" element={<VideoProductionSuite />} />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
