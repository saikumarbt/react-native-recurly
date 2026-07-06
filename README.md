# Recurrly

![Recurrly Banner](assets/images/recurrly_banner.png)

**Recurrly** is a full‑stack subscription management application designed to help users monitor and control their recurring expenses in one centralized hub. Built using a modern "Next.js‑style" mobile architecture, the app features robust subscription tracking for both active and inactive charges, automated email reminders to ensure users never miss a billing date.

---

## ⚙️ Tech Stack

### Frontend & Mobile
- **React Native** – Build native iOS and Android apps with a single codebase.
- **Expo** – Streamlined workflow, file‑based routing, and EAS services.
- **TypeScript** – Strong static typing for a maintainable codebase.
- **NativeWind** – Tailwind‑CSS utilities for rapid UI development.

### Backend & Database
- **Node.js** – High‑performance JavaScript runtime.
- **Express** – Minimalist web framework for API routing.
- **MongoDB** – Flexible NoSQL storage for user and subscription data.

### Infrastructure & Tools
- **Clerk** – Secure authentication and user management.
- **PostHog** – Product analytics and event tracking.
- **CodeRabbit** – AI‑powered code review assistant.

---

## 🔋 Features

- **✨ Subscription Dashboard** – Central hub to monitor all recurring expenses with a clean UI built with NativeWind.
- **📊 Active & Inactive Tracking** – Toggle and categorize subscriptions to see where money is going.
- **⏰ Scheduled Email Reminders** – Automated notifications before billing dates.
- **🔐 Secure Authentication** – Clerk integration for enterprise‑grade sign‑ups and logins.
- **🧭 Native Navigation** – Custom tab navigation delivering a fluid, high‑performance experience on iOS and Android.
- **💾 Full‑Stack Data Persistence** – Node.js/Express backend with MongoDB storage.
- **💳 Monetization Ready** – Integrated billing and payment flows.
- **📈 Production‑Grade Analytics** – Real‑time insights via PostHog.
- **…and many more** – Architecture, reusability, and clean code patterns.

---

## 🤸 Quick Start

### Prerequisites
- **Git**
- **Node.js** (>= 20)
- **npm** (or Yarn)

### Clone the Repository
```bash
git clone https://github.com/adrianhajdin/react-native-recurrly.git
cd react-native-recurrly
```

### Install Dependencies
```bash
npm install
```

### Run the Development Server
```bash
npx expo start
```
- Press **a** to open Android emulator, **i** for iOS simulator, **w** for web, etc.

### Environment Variables
Create a `.env` file in the project root:
```dotenv
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
EXPO_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```
Replace placeholders with real credentials.

---

## 📱 Running the Project
```bash
npm run dev
```
Open `http://localhost:3000` in your browser (web) or scan the QR code with **Expo Go** on your device.

---

## 📚 Learn More
- [Expo Documentation](https://docs.expo.dev/)
- [NativeWind Docs](https://nativewind.dev/)
- [Clerk Docs](https://clerk.dev/docs)
- [PostHog Docs](https://posthog.com/docs)

---

*Happy coding!*