# 🚀 Real-Time Trading Dashboard  
A full-stack assignment built using Golang (Backend) + React (Frontend) simulating a real-time trading environment with live stock price streaming and order placement.

---

## 🎥 Demo Video  
📌 YouTube Demo: https://youtu.be/nvr_1XkyKhM

---

## 🛠️ Tech Stack  
Backend: Golang, WebSockets, REST APIs, Go Routines  
Frontend: React, WebSocket API, REST API, CSS/Tailwind  
Tools: Git, Postman, VS Code

---

## 📂 Project Overview  
This dashboard simulates a real-time trading platform where:  
- Live stock prices update every few seconds  
- Updates are broadcasted using WebSockets  
- Users can place Buy/Sell orders  
- All orders are displayed and stored in memory  

---

## ⚙️ Backend Features  

### 1. GET /prices  
Returns current mock stock prices like AAPL, TSLA, AMZN, INFY, TCS.

### 2. POST /orders  
Accepts Buy/Sell orders.  
Example:
{
  "symbol": "AAPL",
  "side": "BUY",
  "quantity": 10,
  "price": 187.50
}

### 3. GET /orders  
Returns list of all orders.

### 4. WebSocket /ws  
Streams real-time stock price updates.  
- Prices change randomly every 1–3 seconds  
- Built using Go routines + channels  
- All connected clients get updates instantly  

---

## 🎨 Frontend Features  

### 📊 Live Prices Table  
- Real-time updates using WebSocket  
- Green/red indicators show price movement  

### 📝 Order Form  
- Inputs: symbol, buy/sell, quantity, price  
- Submits order via REST API  

### 📋 Orders Table  
- Displays all submitted orders  
- Fetches data from GET /orders  

---

## ▶️ How to Run Locally  

### Backend
cd backend  
go mod tidy  
go run main.go  

### Frontend
cd frontend  
npm install  
npm run dev  

---

## 📡 Sample WebSocket Message  
{
  "symbol": "TSLA",
  "price": 242.15,
  "change": "-0.8%"
}

---

## 📁 Project Structure  

  trading-dashboard/
  
    backend/
        main.go
        go.mod
        go.sum
        Dockerfile

    frontend/
        src/
            App.js
            index.js
            App.css

    README.md



---

## ⭐ Highlights  
- Real-time WebSocket architecture  
- Efficient Go routines for price simulation  
- Clean and modular backend structure  
- Smooth UI with React + dynamic updates  
- Visual price movement indicators  

---

## 📬 Contact  
Manish Yadav – Full Stack Developer  
GitHub: ttps://github.com/Mannu14/House-of-Edtech.git

---
