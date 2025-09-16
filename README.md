# 🎨 Coolify Management Platform - Frontend

<p align="center">
  <img src="https://nextjs.org/static/favicon/favicon-32x32.png" width="32" alt="Next.js Logo" />
  <img src="https://ui.shadcn.com/favicon.ico" width="32" alt="shadcn/ui Logo" />
</p>

<p align="center">
  A modern, responsive web interface for managing Coolify deployments.
  <br />
  Built with Next.js, React, and shadcn/ui components.
</p>

---

## ✨ Features

- 🔐 **Secure Authentication** with JWT token management
- 👥 **Role-based Interface** (Admin Panel / Developer Dashboard)
- 📊 **Admin Panel** with user management and audit logs
- 🚀 **Developer Dashboard** with real-time project status
- 📱 **Responsive Design** works on desktop, tablet, and mobile
- 🎯 **Project Management** with search and filtering
- 🔄 **Real-time Updates** for container status and logs
- 🌍 **Environment Variables** management
- 📈 **Activity Monitoring** with comprehensive logs

---

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **State Management**: React Hooks + Context
- **HTTP Client**: Axios
- **Authentication**: JWT with automatic token validation
- **Icons**: Lucide React
- **Build Tool**: Turbopack

---

## ⚙️ Environment Variables

Create a `.env.local` file in the root directory:

```env
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# Authentication Settings
NEXT_PUBLIC_JWT_EXPIRES_IN=7d

# Development Settings (optional)
NEXT_PUBLIC_DEBUG=false
```

### 🔧 Configuration Options

- **NEXT_PUBLIC_API_URL**: Backend API URL (required)
- **NEXT_PUBLIC_JWT_EXPIRES_IN**: Token expiration time
- **NEXT_PUBLIC_DEBUG**: Enable debug logging

---

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- npm, yarn, or pnpm
- Running backend API

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd coolify-managment-front
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 📱 User Interfaces

### 🔧 Admin Panel (`/admin`)
- **User Management**: Create, activate, deactivate users
- **Project Assignment**: Assign projects to developers
- **Audit Logs**: Monitor all user activities
- **System Overview**: Platform statistics

### 💻 Developer Dashboard (`/dashboard`)  
- **Project Cards**: Visual project status indicators
- **Container Controls**: Start, stop, restart containers
- **Environment Variables**: Manage project configurations
- **Real-time Logs**: View container output
- **Status Monitoring**: Live container health checks

### 🔐 Authentication (`/login`)
- **Secure Login**: JWT-based authentication
- **Auto-logout**: On token expiration
- **Role Redirection**: Automatic role-based routing

---

## 🎨 UI Components

Built with **shadcn/ui** for consistency and accessibility:

- **Navigation**: Responsive sidebar and mobile menu
- **Cards**: Project status and information cards
- **Tables**: User management and audit logs
- **Modals**: Environment variables and project assignment
- **Forms**: Login and configuration forms
- **Badges**: Status indicators and role labels
- **Buttons**: Action buttons with loading states

---

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run dev:turbo    # Start with Turbopack (faster builds)

# Building
npm run build        # Build for production
npm run start        # Start production server
npm run export       # Export static site

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript type checking

# Dependencies
npm run analyze      # Analyze bundle size
npm run update       # Update dependencies
```

### Project Structure

```
app/
├── (auth)/
│   └── login/           # Login page
├── admin/               # Admin panel
├── dashboard/           # Developer dashboard
├── globals.css          # Global styles
├── layout.tsx          # Root layout
└── page.tsx            # Landing page

components/
├── ui/                 # shadcn/ui components
├── admin-logs-panel.tsx
├── project-card.tsx
├── user-table.tsx
└── ...

hooks/
├── use-auth.ts         # Authentication hook
├── use-toast.ts        # Toast notifications
└── use-token-validation.ts

lib/
├── api.ts              # API client
├── auth-store.ts       # Auth state management
├── constants.ts        # App constants
└── utils.ts           # Utility functions
```

---

## 🔐 Authentication Flow

1. **Login**: User submits credentials
2. **Token Storage**: JWT stored in localStorage
3. **Auto-validation**: Token validated on app load
4. **Route Protection**: AuthGuard checks permissions
5. **Auto-logout**: Invalid/expired tokens trigger logout
6. **Role Routing**: Users redirected based on role

---

## 🎯 Key Features

### 📊 Real-time Status Updates
- Container health monitoring
- Automatic status refresh
- Visual status indicators
- Loading states and transitions

### 🔍 Advanced Search & Filtering
- Project search by name/description
- User filtering in admin panel
- Log filtering by date/user/action
- Export capabilities

### 📱 Responsive Design
- Mobile-first approach
- Adaptive layouts
- Touch-friendly interactions
- Accessible components

### 🔄 State Management
- React Context for auth state
- Local state for UI components
- Optimistic updates
- Error handling

---

## 🚀 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm run start
```

### Static Export (Optional)

```bash
# Generate static site
npm run export

# Files will be in ./out directory
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

---


### API Configuration

Update `lib/constants.ts` for API settings:

```ts
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL,
  TIMEOUT: 10000,
}
```

---

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Error**
   - Check `NEXT_PUBLIC_API_URL` in `.env.local`
   - Verify backend server is running
   - Check CORS configuration

2. **Authentication Issues**
   - Clear localStorage: `localStorage.clear()`
   - Check token expiration
   - Verify JWT_SECRET matches backend

3. **Build Errors**
   - Clear `.next` folder: `rm -rf .next`
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check TypeScript errors: `npm run type-check`

4. **Styling Issues**
   - Clear Tailwind cache
   - Check CSS imports in `globals.css`
   - Verify component class names

---
