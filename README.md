# Felicity Event Management System (EMS)

A full-stack event management platform built for **Felicity** — the annual techno-cultural fest. The system supports three user roles (**Participant**, **Organizer/Club**, **Admin**) and provides end-to-end event lifecycle management, including registration, merchandise sales, attendance tracking, and real-time discussions.

---

## 🛠 Tech Stack

- **Frontend**: React 18, React Router v6, Fuse.js (fuzzy search), Socket.IO Client, html5-qrcode
- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT (jsonwebtoken) + bcrypt password hashing
- **Email**: Nodemailer (with Ethereal fallback for dev)
- **File Upload**: Multer (payment proof images)
- **QR Codes**: qrcode (generation), html5-qrcode (scanning)

---

## 📦 Setup & Installation

### Prerequisites
- Node.js >= 18.x
- MongoDB (local or Atlas)
- npm or yarn

### Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
MONGODB_URI=mongodb://localhost:27017/felicity
JWT_SECRET=your_jwt_secret_here
ADMIN_EMAIL=admin@felicity.iiit.ac.in
ADMIN_PASSWORD=admin123

# Optional: SMTP for real emails (falls back to Ethereal if not set)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@felicity.iiit.ac.in

PORT=5000
```

```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend runs on `http://localhost:3000` and the backend on `http://localhost:5000`.

---

## 👥 User Roles & Features

### 🎓 Participant
- Register with IIIT email (`@iiit.ac.in`) or as external participant
- Onboarding flow: select interests and follow clubs
- Browse events with search (fuzzy via Fuse.js), filters (type, eligibility, date), and trending
- Event ordering prioritized by followed clubs and matching interests
- Register for normal events with custom registration forms
- Purchase merchandise with size/color selection and stock limits
- Upload payment proofs for merchandise (payment approval workflow)
- Receive ticket confirmation emails with embedded QR codes
- View participation history (Normal, Merchandise, Completed, Cancelled tabs)
- Calendar integration: download ICS, add to Google Calendar, add to Outlook
- Batch export all events to calendar
- Follow/unfollow clubs/organizers
- Change password from profile

### 🏢 Organizer (Club)
- Dashboard with event cards (status, type, analytics)
- Create events (Draft → Define Fields → Publish)
- Custom registration form builder (text, dropdown, checkbox, file upload fields)
- Forms locked after first registration
- Event editing rules based on status (Draft: free edit, Published: limited, Ongoing: status only)
- Participant list with search, filter, and CSV export
- Merchandise order management with approve/reject workflow
- View payment proofs and approve orders (triggers ticket generation + email)
- QR scanner for attendance (camera, file upload, or manual override)
- Live attendance dashboard (scanned vs not-scanned, progress bar)
- Attendance CSV export
- Manual attendance override with audit logging
- Real-time discussion forum with threading, pinning, reactions, and moderation
- Discord webhook: auto-post new events when published
- Organizer password reset request (submitted to Admin)
- Profile editing (name, category, description, contact info, Discord webhook URL)

### 🔒 Admin
- Seeded via environment variables (no registration)
- Create organizer/club accounts (auto-generates credentials)
- Disable, archive, or permanently delete organizers
- Disabled organizers cannot log in
- View and approve/reject organizer password reset requests
- Auto-generates new temporary password on approval

---

## 🏗 Architecture

### Backend (Express.js REST API + Socket.IO)

```
backend/
├── src/
│   ├── config/         # DB connection, admin seeding
│   ├── controllers/    # Business logic
│   ├── middleware/      # Auth (JWT) & role-based access
│   ├── models/         # Mongoose schemas
│   ├── routes/         # API routes
│   ├── utils/          # Calendar, mailer, ticket email, Discord, upload
│   └── server.js       # Entry point
├── uploads/            # Payment proof images
└── .env
```

### Frontend (React SPA)

```
frontend/
├── src/
│   ├── components/     # Reusable (Navbar, Forum)
│   ├── context/        # AuthContext (JWT + role)
│   ├── pages/          # Route pages
│   ├── services/       # API client (axios)
│   └── App.jsx         # Router config
```

---

## 🌟 Advanced Features (Implemented)

### Tier A: Core Advanced Features
1. **Merchandise Payment Approval Workflow**
   - Participant places order → uploads payment proof (image) → order enters PENDING state
   - Organizer views orders with payment proofs → approves (triggers stock decrement + ticket + email) or rejects
   - Rejected orders can re-upload proof and resubmit

2. **QR Scanner & Attendance Tracking**
   - Camera-based QR scanning (html5-qrcode)
   - File upload QR scanning (upload image of QR)
   - Manual attendance override with mandatory reason (audit trail)
   - Live attendance dashboard: scanned vs not-yet-scanned with participant details
   - Attendance CSV export
   - Duplicate scan prevention
   - Audit log for manual overrides

### Tier B: Real-time & Communication Features
1. **Real-Time Discussion Forum**
   - Socket.IO-powered real-time messaging
   - Message threading (reply to specific messages)
   - Pinned messages (organizer can pin/unpin)
   - Emoji reactions (👍 ❤️ 🎉 😂 🔥 👏)
   - Organizer announcements (highlighted messages)
   - Moderation: organizer can delete messages and pin/unpin in real-time
   - New message notifications
   - Sender names resolved from participant/organizer profiles

2. **Organizer Password Reset Workflow**
   - Organizer requests reset from profile
   - Admin views all pending requests with club name, date, reason
   - Admin approves (auto-generates new password) or rejects with comments
   - Status tracking throughout

### Tier C: Integration & Enhancement Features
1. **Add to Calendar Integration**
   - ICS file download with timezone and reminder configuration
   - Google Calendar deep link
   - Outlook Calendar deep link
   - Batch export all registered events to single ICS file
   - Configurable timezones and reminder minutes

---

## 🛡 Security

- Passwords hashed with bcrypt (10 rounds)
- JWT-based stateless authentication
- Role-based middleware on all protected routes
- Frontend route guards with ProtectedRoute and AuthenticatedRoute components
- Session persistence via localStorage
- IIIT email domain validation for participant registration
- File upload validation (image-only, 5MB limit)

---

## 🔧 Design Decisions

1. **Event Status Machine**: DRAFT → PUBLISHED → ONGOING → COMPLETED → CLOSED
2. **Merchandise Order Flow**: CREATED → PENDING (after proof upload) → APPROVED/REJECTED
3. **Custom Forms**: Schema-driven approach — organizers define form fields, participants fill them during registration, responses stored as JSON
4. **Discord Integration**: Webhook URL stored per organizer — when an event is published, an embedded message is automatically posted
5. **QR Code Data**: Contains JSON with ticketId, eventName, participantName — scanned and parsed by the attendance system
6. **Real-Time**: Socket.IO rooms per event for forum messages, with REST API fallback for data persistence

---

## 📡 API Endpoints

| Module | Endpoint | Method | Auth |
|--------|----------|--------|------|
| Auth | `/api/auth/register` | POST | — |
| Auth | `/api/auth/login` | POST | — |
| Events | `/api/events` | GET | Auth |
| Events | `/api/events/:id` | GET | Auth |
| Events | `/api/events/create` | POST | Organizer |
| Events | `/api/events/:id/publish` | POST | Organizer |
| Participants | `/api/participants/me` | GET/PUT | Participant |
| Participants | `/api/participants/events/:id/register` | POST | Participant |
| Merchandise | `/api/merchandise/:eventId/order` | POST | Participant |
| Merchandise | `/api/merchandise/orders/:id/payment-proof` | POST | Participant |
| Merchandise | `/api/merchandise/orders/:id/approve` | PATCH | Organizer |
| Attendance | `/api/attendance/scan` | POST | Organizer |
| Attendance | `/api/attendance/manual-override` | POST | Organizer |
| Attendance | `/api/attendance/:eventId/dashboard` | GET | Organizer |
| Attendance | `/api/attendance/:eventId/export` | GET | Organizer |
| Forum | `/api/forum/:eventId` | GET | Auth |
| Forum | `/api/forum/:msgId/pin` | PATCH | Organizer |
| Forum | `/api/forum/:msgId/react` | POST | Auth |
| Admin | `/api/admin/organizers` | POST/GET | Admin |
| Password Reset | `/api/password-reset/request` | POST | Organizer |
| Password Reset | `/api/password-reset/:id/approve` | POST | Admin |

---

## 📄 License

This project is developed for academic purposes as part of the Felicity techno-cultural fest platform.
