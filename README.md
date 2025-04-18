# 🕺 PlesPles

**Our website** [https://plesplesbynabiti.vercel.app/](https://plesplesbynabiti.vercel.app/)

## 🧠 What Is It?

PlesPlesRevolucija is a browser-based rhythm game inspired by Dance Dance Revolution. It transforms your mobile phones into motion sensors, enabling you to dance using two smartphones strapped to your ankles.

Built during a hackathon, this project merges web technologies and real-time motion tracking to deliver an immersive dance experience.

## 🧰 Tech Stack

- **Frontend:** React (TypeScript)
- **Motion Detection:** Native mobile apps (Android) utilizing accelerometer and gyroscope sensors
- **Backend:** Python (Flask)
- **Communication:** WebSockets for real-time data transfer
- **Deployment:** Vercel (frontend), local server (backend)

## 📦 Repository Structure
PlesPles/ <br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── desktop/ # React-based game interface <br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── mobile/ # Android app for motion tracking <br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── requirements.txt # Python backend dependencies <br> 
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── README.md <br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── .gitignore <br>

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/JuiceVodka/PlesPles.git
cd PlesPles
```

### 2. Set Up the Backend

Ensure Python 3.8+ is installed.

```bash
python backend/server.py
```

### 3. Launch the Frontend

Navigate to the `desktop/` directory and start the React app:

```bash
cd desktop
npm install
npm start
```

### 4. Prepare the Mobile Devices

- Build and install the Android app located in the `mobile/` directory on two smartphones.
- Securely attach the phones to your ankles.
- Ensure both devices are connected to the same network as the backend server.

### 5. Start Dancing!

Access the game interface via your browser at `http://localhost:3000` and follow the on-screen instructions to begin dancing.

## 🎯 Hackathon Highlights

- **Team:**Igor Nikolaj Sok,  Andraž Zrimšek, Vanessa Jačmenjak, Bor Pangeršič
- **Location:** Ljubljana, Slovenia
- **Date:** April 2025


