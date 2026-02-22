import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

import Login from "./pages/Login";
import EventList from "./pages/EventList";
import EventDetails from "./pages/EventDetails";
import ParticipantDashboard from "./pages/ParticipantDashboard";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import Navbar from "./components/Navbar";
import Organizers from "./pages/Organizers";
import Profile from "./pages/Profile";
import ManageClubs from "./pages/ManageClubs";
import EventCreate from "./pages/EventCreate";
import OrganizerEventDetails from "./pages/OrganizerEventDetails";
import EventEdit from "./pages/EventEdit";
import OrganizerDetails from "./pages/OrganizerDetails";
import TicketDetails from "./pages/TicketDetails";
import PasswordResetRequests from "./pages/PasswordResetRequests";
import OrganizerOngoing from "./pages/OrganizerOngoing";
import QRScanner from "./pages/QRScanner";




function ProtectedRoute({ children, role }) {
  const { token, role: userRole } = useContext(AuthContext);

  if (!token) return <Navigate to="/login" />;
  if (role && userRole !== role) return <Navigate to="/" />;

  return children;
}

// Public route that requires authentication but any role
function AuthenticatedRoute({ children }) {
  const { token } = useContext(AuthContext);

  if (!token) return <Navigate to="/login" />;

  return children;
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/"
            element={
              <AuthenticatedRoute>
                <EventList />
              </AuthenticatedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <AuthenticatedRoute>
                <EventList />
              </AuthenticatedRoute>
            }
          />
          <Route
            path="/events/:id"
            element={
              <AuthenticatedRoute>
                <EventDetails />
              </AuthenticatedRoute>
            }
          />

          <Route
            path="/organizers"
            element={
              <AuthenticatedRoute>
                <Organizers />
              </AuthenticatedRoute>
            }
          />
          <Route
            path="/organizers/:id"
            element={
              <AuthenticatedRoute>
                <OrganizerDetails />
              </AuthenticatedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <AuthenticatedRoute>
                <Profile />
              </AuthenticatedRoute>
            }
          />


          <Route
            path="/participant"
            element={
              <ProtectedRoute role="PARTICIPANT">
                <ParticipantDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets/:ticketId"
            element={
              <ProtectedRoute role="PARTICIPANT">
                <TicketDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/organizer"
            element={
              <ProtectedRoute role="ORGANIZER">
                <OrganizerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/organizer/ongoing"
            element={
              <ProtectedRoute role="ORGANIZER">
                <OrganizerOngoing />
              </ProtectedRoute>
            }
          />

          <Route
            path="/events/create"
            element={
              <ProtectedRoute role="ORGANIZER">
                <EventCreate />
              </ProtectedRoute>
            }
          />

          <Route
            path="/organizer/events/:id"
            element={
              <ProtectedRoute role="ORGANIZER">
                <OrganizerEventDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/organizer/events/:id/edit"
            element={
              <ProtectedRoute role="ORGANIZER">
                <EventEdit />
              </ProtectedRoute>
            }
          />

          <Route
            path="/organizer/events/:eventId/scanner"
            element={
              <ProtectedRoute role="ORGANIZER">
                <QRScanner />
              </ProtectedRoute>
            }
          />

          <Route
            path="/onboarding"
            element={
              <ProtectedRoute role="PARTICIPANT">
                <Onboarding />
              </ProtectedRoute>
            }
          />


          <Route
            path="/admin"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/organizers"
            element={
              <ProtectedRoute role="ADMIN">
                <ManageClubs />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/password-requests"
            element={
              <ProtectedRoute role="ADMIN">
                <PasswordResetRequests />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
