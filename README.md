# Roots Across Generations

A modern family genealogy platform that helps families collaboratively build, preserve, and explore their family history. The application provides an interactive family tree, relationship discovery, memories, messaging, notifications, and privacy controls, creating a digital legacy that can be passed down through generations.

---

## Features

### Authentication

- Email authentication
- Google Sign-In
- JWT-based authentication
- Secure session management

### Family Management

- Create a new family
- Join existing families
- Family invitations
- QR code family joining
- Family roles and permissions

### Interactive Family Tree

- Interactive family tree visualization
- Add family members
- Edit member information
- Relationship explorer
- Generation calculation
- Zoom and navigation controls

### Member Profiles

- Personal profiles
- Profile photos
- Privacy settings
- Core family view
- Timeline

### Memories

- Upload photos
- Upload videos
- Family memory gallery
- Member-specific memories
- Memory details
- Firebase Storage integration

### Messaging

- One-to-one conversations
- Real-time messaging
- Typing indicators
- Conversation management

### Notifications

- In-app notifications
- Birthday reminders
- Message notifications
- Join request notifications
- Notification preferences

### Join Requests

- Request to join a family
- Relationship verification
- Approval workflow
- Relationship editing

### Contact Requests

- Member contact requests
- Approval workflow
- Privacy-aware contact sharing

### Search

- Search family members
- Fast indexed search
- Relationship-based results

### Administration

- Family management dashboard
- Relationship editor
- Member management
- Family settings
- Audit logs

---

## Technology Stack

### Frontend

- React
- Vite
- Tailwind CSS
- React Router
- React Query
- Axios
- React Hook Form
- Zod
- Socket.IO Client
- React Flow (@xyflow/react)
- Framer Motion

### Backend

- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Passport Google OAuth
- Firebase Admin SDK
- Socket.IO
- Multer
- Node Cron
- Zod

### Database

- PostgreSQL
- Prisma ORM

### Cloud Services

- Firebase Storage
- Google OAuth

### Deployment

- Frontend: Vercel
- Backend: Render
- Database: PostgreSQL

---

## Project Structure

```
Roots-Across-Generations/
│
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   └── validators/
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── features/
│   │   ├── pages/
│   │   ├── services/
│   │   └── validators/
│   └── package.json
│
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- Git
- Firebase Project
- Google Cloud OAuth credentials

---

## Clone the Repository

```bash
git clone https://github.com/afrozeshaik2005-spec/Roots-Across-Generations.git

cd Roots-Across-Generations
```

---

## Backend Setup

```bash
cd backend

npm install
```

Create a `.env` file.

Example:

```env
DATABASE_URL=

JWT_ACCESS_SECRET=

JWT_REFRESH_SECRET=

GOOGLE_CLIENT_ID=

GOOGLE_CLIENT_SECRET=

FIREBASE_PROJECT_ID=

FIREBASE_CLIENT_EMAIL=

FIREBASE_PRIVATE_KEY=

FIREBASE_STORAGE_BUCKET=
```

Run Prisma migrations.

```bash
npx prisma migrate deploy
```

Start the backend.

```bash
npm run dev
```

---

## Frontend Setup

```bash
cd frontend

npm install
```

Create a `.env` file.

```env
VITE_API_URL=http://localhost:5000

VITE_GOOGLE_CLIENT_ID=
```

Run the frontend.

```bash
npm run dev
```

---

## Database

This project uses PostgreSQL with Prisma ORM.

Useful commands:

```bash
npx prisma generate

npx prisma migrate dev

npx prisma migrate deploy

npx prisma studio
```

---

## Deployment

### Backend

Recommended platform:

- Render

### Frontend

Recommended platform:

- Vercel

### Database

- PostgreSQL

---

## Security

Sensitive configuration is never committed.

Ignored files include:

- `.env`
- `node_modules`
- `dist`
- `uploads`
- logs

Only template environment files are tracked:

```
backend/.env.example

frontend/.env.example
```

---

## Repository Status

Current project status:

- Production-ready architecture
- Secure environment variable management
- Clean Git history
- Prisma migrations included
- GitHub repository configured
- Ready for deployment

---

## Future Enhancements

- Family tree import/export
- Advanced relationship analytics
- Event management
- AI-assisted family history insights
- Multi-language support
- Mobile application
- Family document archive
- Shared cloud storage integration

---

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Push your branch.
5. Open a Pull Request.

---

## License

This project is currently not licensed.

Choose an appropriate open-source license before public release if desired.

---

## Author

**Afroze Shaik**

GitHub: https://github.com/afrozeshaik2005-spec

---

## Acknowledgements

Built using:

- React
- Express.js
- Prisma
- PostgreSQL
- Firebase
- Google OAuth
- Socket.IO
- Tailwind CSS
- Vite
