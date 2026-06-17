import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Plots from "@/pages/Plots";
import PlotDetail from "@/pages/PlotDetail";
import PlotManage from "@/pages/PlotManage";
import Claims from "@/pages/Claims";
import ClaimReview from "@/pages/ClaimReview";
import JournalList from "@/pages/JournalList";
import JournalTimeline from "@/pages/JournalTimeline";
import JournalNew from "@/pages/JournalNew";
import Announcements from "@/pages/Announcements";
import AnnouncementManage from "@/pages/AnnouncementManage";
import ShareCommunity from "@/pages/ShareCommunity";
import ShareNew from "@/pages/ShareNew";
import Bills from "@/pages/Bills";
import BillCreate from "@/pages/BillCreate";
import Renewal from "@/pages/Renewal";
import Profile from "@/pages/Profile";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Toast from "@/components/Toast";
import { useStore } from "@/store";
import { useEffect } from "react";

export default function App() {
  const { fetchCurrentUser, isAuthenticated } = useStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrentUser();
    }
  }, [isAuthenticated, fetchCurrentUser]);

  return (
    <Router>
      <Toast />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/plots" element={<Plots />} />
            <Route path="/plots/:id" element={<PlotDetail />} />
            <Route path="/plots/manage" element={<ProtectedRoute adminOnly><PlotManage /></ProtectedRoute>} />
            <Route path="/claims" element={<Claims />} />
            <Route path="/claims/review" element={<ProtectedRoute adminOnly><ClaimReview /></ProtectedRoute>} />
            <Route path="/journal" element={<JournalList />} />
            <Route path="/journal/:plotId" element={<JournalTimeline />} />
            <Route path="/journal/new/:plotId" element={<JournalNew />} />
            <Route path="/journal/edit/:id" element={<JournalNew />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/announcements/manage" element={<ProtectedRoute adminOnly><AnnouncementManage /></ProtectedRoute>} />
            <Route path="/share" element={<ShareCommunity />} />
            <Route path="/share/new" element={<ShareNew />} />
            <Route path="/bills" element={<Bills />} />
            <Route path="/bills/create" element={<ProtectedRoute adminOnly><BillCreate /></ProtectedRoute>} />
            <Route path="/renewal" element={<Renewal />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}
