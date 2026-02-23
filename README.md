# Felicity Event Management System (EMS)

A state-of-the-art, full-stack event management platform designed specifically for **Felicity**, IIIT Hyderabad's annual techno-cultural fest. This platform streamlines the entire event lifecycle for participants, organizers, and administrators, offering a premium and interactive experience.

---

## 🚀 Tech Stack & Library Justifications

The project utilizes a modern MERN-like stack, chosen for its scalability, speed of development, and rich ecosystem.

### **Backend (Node.js & Express)**
- **Express.js**: Chosen for its minimalist and flexible framework that allows for rapid API development and robust routing.
- **Mongoose (MongoDB ODM)**: Solves the problem of flexible data structures. Since different events (competitions, workshops, merchandise) require different fields, MongoDB's schema-less nature paired with Mongoose validation is ideal.
- **Socket.IO**: Used for real-time bidirectional communication. It solves the latency issue in communication between participants and organizers in the discussion forum.
- **JWT (jsonwebtoken)**: Provides a secure, stateless authentication mechanism. This eliminates the need for server-side session storage, allowing the backend to scale horizontally.
- **Bcrypt**: Essential for security; it ensures that user passwords are never stored in plaintext and are resistant to brute-force attacks.
- **Multer**: Handles `multipart/form-data`, specifically for payment proof image uploads, which standard Express body-parsers cannot handle.
- **Nodemailer**: Automates the delivery of transaction emails and tickets, solving the problem of manual notification management.

### **Frontend (React)**
- **React 19**: Provides a component-based architecture for a maintainable and high-performance SPA (Single Page Application).
- **React Router v7**: Handles complex client-side routing and protected paths efficiently.
- **Axios**: A promise-based HTTP client that simplifies API communication with interceptors for JWT token injection.
- **Fuse.js**: Implements fuzzy-searching. It allows participants to find events even with typos or partial names without frequent server-side hits.
- **html5-qrcode**: Enables high-performance, browser-based QR code scanning using the device's camera, removing the need for dedicated hardware.
- **Vanilla CSS (Custom Design System)**: Instead of generic UI libraries, we implemented a custom CSS variable-based design system to achieve **premium aesthetics**, dark mode support, and micro-animations with zero bloat.

---

## 🌟 Advanced Features

### **Tier A: Professional Logistics & Security**
#### 1. Merchandise Payment Approval Workflow
- **Selection Justification**: Merchandise in fests often involves manual UPI/Bank transfers. This workflow ensures no order is processed without verified payment.
- **Implementation**: Participants upload a payment proof (image). The order status moves from `CREATED` → `PENDING`. Organizers can then inspect the image and `APPROVE` or `REJECT`. Approval triggers automated stock reduction and ticket generation.
- **Technical Decision**: Used Multer for reliable file storage and a strict state-machine to prevent double-spending or illegal status transitions.

#### 2. QR Attendance System with Manual Override
- **Selection Justification**: Manual check-ins are slow and error-prone. QR codes provide speed, while manual overrides handle edge cases (e.g., participants with dead phones).
- **Implementation**: Unique QR codes are embedded in tickets. Organizers scan them via the web camera. If scanning fails, they can perform a manual check-in with a mandatory "Reason" field for auditing.
- **Technical Decision**: Implemented duplicate-scan prevention at the database level to ensure one-time entry per ticket.

### **Tier B: Real-Time Interaction & System Integrity**
#### 1. Real-Time Discussion Forum
- **Selection Justification**: Enhances participant engagement and provides a direct channel for organizers to push live updates during an event.
- **Implementation**: Uses Socket.IO for instant message delivery. Features include message pinning (for announcements), emoji reactions, and threading (replies).
- **Technical Decision**: Messages are persisted in MongoDB after being broadcasted, ensuring history is available for late-joiners.

#### 2. Admin-Mediated Password Reset
- **Selection Justification**: For organzier accounts (Clubs), automated "Forgot Password" is less secure. A manual approval flow via Admin maintains festival security.
- **Implementation**: Organizers request a reset; Admins review the request and generate a temporary credential upon approval.
- **Technical Decision**: Created a specialized `PasswordReset` model to track the lifecycle of requests and audit logs.

### **Tier C: Integration & Productivity**
#### 1. "Add to Calendar" Ecosystem
- **Selection Justification**: Participants often register for multiple events and forget timings. Integration ensures the event is on their personal schedule.
- **Implementation**: Support for Google Calendar, Outlook, and offline ICS files. Includes a "Batch Export" feature to download all registered events at once.
- **Technical Decision**: ICS files are generated dynamically on the fly using a utility helper that handles timezone offsets correctly.

#### 2. Discord Webhook Integration
- **Selection Justification**: Most tech/cultural clubs use Discord for community management. Auto-posting new events increases reach instantly.
- **Implementation**: When an organizer publishes an event, the backend triggers a POST request to their configured Discord Webhook URL with a rich embedded message.

---

## 🎨 Design Choices & Technical Decisions

1. **Schema-Driven Form Builder**: We avoided hardcoded registration fields. Organizers can build custom forms (Text, Dropdown, Checkbox). Data is stored as a JSON object, making the system adaptable to any event type.
2. **State Machine Architecture**: Events move through `DRAFT` → `PUBLISHED` → `ONGOING` → `COMPLETED`. This ensures that participants cannot register for events that haven't started or have already ended.
3. **Premium UI/UX**:
   - Developed a **Glassmorphism-inspired UI** using `backdrop-filter`.
   - Built a custom **Dark Mode** toggle using CSS variables and `data-theme` attributes.
   - Implemented **Skeleton Loaders** for a perceived performance boost during data fetching.
4. **Security Hardening**:
   - Role-based Access Control (RBAC) via Express middleware.
   - Validation of email domains (IIIT-H students vs External).
   - Rate limiting and payload size limits (10MB) for file uploads.

---

## 🛠 Setup & Installation

Follow these steps to run the project locally.

### **Prerequisites**
- **Node.js** (v18 or higher)
- **MongoDB** (Local instance or MongoDB Atlas)
- **npm** (comes with Node.js)

### **1. Clone the Repository**
```bash
git clone <repository-url>
cd felicity
```

### **2. Backend Configuration**
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` root:
   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key_change_this
   ADMIN_EMAIL=admin@felicity.iiit.ac.in
   ADMIN_PASSWORD=admin123
   PORT=5000
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

### **3. Frontend Configuration**
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`.