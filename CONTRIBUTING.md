# Contributing to MediLink

Thank you for your interest in contributing to **MediLink**! Together we can build an open, accessible, and life-saving healthcare and telemedicine ecosystem.

---

## Code of Conduct
By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## Getting Started

1. **Fork the Repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/harshil51/MedLink-.git
   cd MedLink-
   ```
3. **Install dependencies** for both frontend and backend:
   ```bash
   # From the root directory:
   npm run install:all
   ```
4. **Configure environment variables**:
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```
5. **Ensure MongoDB is running** on your local machine or connect to a remote MongoDB Atlas cluster.
6. **Launch both development servers**:
   - Terminal 1: `npm run dev:server` (Starts Express + Socket.IO on port `5001`)
   - Terminal 2: `npm run dev:client` (Starts Vite on port `5173`)

---

## Development Guidelines

### Branching Strategy
- Create a feature branch with a descriptive name:
  ```bash
  git checkout -b feature/emergency-sms-alerts
  # or
  git checkout -b fix/appointment-timezone-bug
  ```

### Code Style & Quality
- Write clear, self-documenting code.
- Ensure the frontend passes lint checks:
  ```bash
  npm run lint:client
  ```
- Verify the frontend builds cleanly without errors:
  ```bash
  npm run build:client
  ```
- Never commit credentials, `.env` files, or uploaded patient data.

### Submitting Pull Requests
1. Push your branch to your GitHub fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request against the `main` branch of the official repository.
3. Fill out the Pull Request template thoroughly.
4. Reference any linked issues (e.g., `Closes #12`).

---

## Questions or Suggestions?
Feel free to open an issue or reach out via GitHub Discussions.
