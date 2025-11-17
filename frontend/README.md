# 🚀 Real-Time Trading Dashboard  
A full-stack assignment built using **Golang (Backend)** + **React (Frontend)** simulating a real-time trading environment with live stock price streaming and order placement.

---

## 🎥 Demo Video  
📌 **YouTube Demo:** *Add your video link here*

---

## 🛠️ Tech Stack  
**Backend:** Golang, Gin/Echo/Fiber, WebSockets, Go Routines, Channels, REST APIs  
**Frontend:** React, WebSocket API, REST API, CSS/Tailwind  
**Tools:** Postman, Git, VS Code

---

## 📂 Project Overview  
This dashboard simulates a real-time trading platform where:  
- Mock stock prices update every few seconds  
- Updates are broadcasted using WebSockets  
- Users can place Buy/Sell orders  
- All orders are displayed and stored in-memory  

---

## ⚙️ Backend Features  
### ✅ 1. GET /prices  
Returns mock stock prices like AAPL, TSLA, AMZN, INFY, TCS.

### ✅ 2. POST /orders  
Accepts Buy/Sell orders.  
Example Request:
```json
{
  "symbol": "AAPL",
  "side": "BUY",
  "quantity": 10,
  "price": 187.50
}
✅ 3. GET /orders
Returns all placed orders.

🔄 4. WebSocket /ws
Streams real-time price updates.

Prices randomly change ±0.5–2%

Implemented with Go routines + channels

All clients receive synchronized updates

🎨 Frontend Features
📊 Live Price Table
Receives real-time updates via WebSocket

Displays green/red indicators on price movement

📝 Order Form
Symbol, side, quantity, price

Submits to backend via POST request

📋 Orders Table
Shows all submitted orders

Fetched from /orders API

▶️ How to Run Locally
Backend
cd backend
go mod tidy
go run main.go
Frontend

cd frontend
npm install
npm run dev
📡 WebSocket Message Example
{
  "symbol": "TSLA",
  "price": 242.15,
  "change": "-0.8%"
}
📁 Project Structure
/backend
    ├── main.go
    ├── routes/
    ├── handlers/
    ├── models/
    ├── websocket/
    └── utils/
    
/frontend
    ├── src/
    ├── components/
    ├── pages/
    └── hooks/
⭐ Highlights
Real-time WebSocket architecture

Efficient Go routines for background price updates

Clean modular folder structure

Smooth, responsive React UI

Visual feedback for price movement

📬 Contact
Manish Yadav – Full Stack Developer
GitHub: your link
LinkedIn: your link

⭐ Star this repo if you like the project!

---

Bas isko README.md me paste karo — styling, headings, formatting sab perfect kaam karega.