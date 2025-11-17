package main

import (
	"crypto/sha256"
	"encoding/hex"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

// JWT Secret Key (production mein environment variable use karo)
var jwtSecret = []byte("ManishYadavSeacretkeyfortradingdashboard123")

// User represents a user account
type User struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Password string `json:"-"` // Never return password in JSON
	Name     string `json:"name"`
}

// Stock represents a stock with its current price
type Stock struct {
	Symbol string  `json:"symbol"`
	Price  float64 `json:"price"`
	Change float64 `json:"change"`
}

// Order represents a buy/sell order
type Order struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Symbol    string    `json:"symbol"`
	Side      string    `json:"side"`
	Quantity  int       `json:"quantity"`
	Price     float64   `json:"price"`
	Timestamp time.Time `json:"timestamp"`
	Status    string    `json:"status"`
}

// LoginRequest for user login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// SignupRequest for user registration
type SignupRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name" binding:"required"`
}

// JWT Claims
type Claims struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// PriceUpdate represents a price update message for WebSocket
type PriceUpdate struct {
	Type   string           `json:"type"`
	Prices map[string]Stock `json:"prices"`
}

var (
	// In-memory storage
	users        = make(map[string]*User)
	usersByEmail = make(map[string]*User)
	usersMutex   sync.RWMutex

	prices = map[string]*Stock{
		"AAPL": {Symbol: "AAPL", Price: 178.50, Change: 0},
		"TSLA": {Symbol: "TSLA", Price: 242.80, Change: 0},
		"AMZN": {Symbol: "AMZN", Price: 145.30, Change: 0},
		"INFY": {Symbol: "INFY", Price: 1450.75, Change: 0},
		"TCS":  {Symbol: "TCS", Price: 3520.40, Change: 0},
	}
	orders      = []Order{}
	ordersMutex sync.RWMutex
	pricesMutex sync.RWMutex

	// WebSocket upgrader
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	// WebSocket clients
	clients      = make(map[*websocket.Conn]bool)
	clientsMutex sync.RWMutex
	broadcast    = make(chan PriceUpdate)
)

func main() {
	rand.Seed(time.Now().UnixNano())

	// Start price update goroutine
	go priceUpdateWorker()
	go handleBroadcasts()

	// Setup Gin router
	router := gin.Default()
	router.Use(corsMiddleware())

	// Public routes (no authentication required)
	public := router.Group("/api")
	{
		public.POST("/signup", signup)
		public.POST("/login", login)
		public.GET("/ws", handleWebSocket)
	}

	// Protected routes (authentication required)
	protected := router.Group("/api")
	protected.Use(authMiddleware())
	{
		protected.GET("/prices", getPrices)
		protected.POST("/orders", createOrder)
		protected.GET("/orders", getOrders)
		protected.GET("/me", getCurrentUser)
	}

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	log.Println("Server starting on :8080")
	router.Run(":8080")
}

// corsMiddleware adds CORS headers
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// authMiddleware validates JWT token
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Authorization header required",
			})
			c.Abort()
			return
		}

		// Remove "Bearer " prefix if present
		if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
			tokenString = tokenString[7:]
		}

		// Parse and validate token
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Set user ID in context
		c.Set("userID", claims.UserID)
		c.Set("email", claims.Email)
		c.Next()
	}
}

// signup handles user registration
func signup(c *gin.Context) {
	var req SignupRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request: " + err.Error(),
		})
		return
	}

	usersMutex.Lock()
	defer usersMutex.Unlock()

	// Check if user already exists
	if _, exists := usersByEmail[req.Email]; exists {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error":   "User with this email already exists",
		})
		return
	}

	// Create new user
	user := &User{
		ID:       generateID(),
		Email:    req.Email,
		Password: hashPassword(req.Password),
		Name:     req.Name,
	}

	users[user.ID] = user
	usersByEmail[user.Email] = user

	// Generate JWT token
	token, err := generateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to generate token",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "User registered successfully",
		"data": gin.H{
			"user":  user,
			"token": token,
		},
	})
}

// login handles user authentication
func login(c *gin.Context) {
	var req LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request: " + err.Error(),
		})
		return
	}

	usersMutex.RLock()
	user, exists := usersByEmail[req.Email]
	usersMutex.RUnlock()

	if !exists || user.Password != hashPassword(req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Invalid email or password",
		})
		return
	}

	// Generate JWT token
	token, err := generateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to generate token",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"data": gin.H{
			"user":  user,
			"token": token,
		},
	})
}

// getCurrentUser returns the authenticated user's information
func getCurrentUser(c *gin.Context) {
	userID := c.GetString("userID")

	usersMutex.RLock()
	user, exists := users[userID]
	usersMutex.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
	})
}

// generateToken creates a JWT token for a user
func generateToken(user *User) (string, error) {
	claims := Claims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// hashPassword creates a SHA256 hash of the password
func hashPassword(password string) string {
	hash := sha256.Sum256([]byte(password))
	return hex.EncodeToString(hash[:])
}

// getPrices returns current prices for all stocks
func getPrices(c *gin.Context) {
	pricesMutex.RLock()
	defer pricesMutex.RUnlock()

	stockList := make([]Stock, 0, len(prices))
	for _, stock := range prices {
		stockList = append(stockList, *stock)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stockList,
	})
}

// createOrder creates a new order
func createOrder(c *gin.Context) {
	userID := c.GetString("userID")

	var order Order

	if err := c.ShouldBindJSON(&order); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	// Validate order
	if order.Symbol == "" || order.Side == "" || order.Quantity <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid order parameters",
		})
		return
	}

	// Check if symbol exists
	pricesMutex.RLock()
	stock, exists := prices[order.Symbol]
	pricesMutex.RUnlock()

	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid symbol",
		})
		return
	}

	// Create order
	order.ID = generateOrderID()
	order.UserID = userID
	order.Price = stock.Price
	order.Timestamp = time.Now()
	order.Status = "completed"

	// Store order
	ordersMutex.Lock()
	orders = append(orders, order)
	ordersMutex.Unlock()

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    order,
		"message": "Order placed successfully",
	})
}

// getOrders returns all orders for the authenticated user
func getOrders(c *gin.Context) {
	userID := c.GetString("userID")

	ordersMutex.RLock()
	defer ordersMutex.RUnlock()

	// Filter orders by user
	userOrders := []Order{}
	for i := len(orders) - 1; i >= 0; i-- {
		if orders[i].UserID == userID {
			userOrders = append(userOrders, orders[i])
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    userOrders,
		"count":   len(userOrders),
	})
}

// handleWebSocket handles WebSocket connections
func handleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}

	clientsMutex.Lock()
	clients[conn] = true
	clientsMutex.Unlock()

	// Send initial prices
	pricesMutex.RLock()
	initialPrices := make(map[string]Stock)
	for symbol, stock := range prices {
		initialPrices[symbol] = *stock
	}
	pricesMutex.RUnlock()

	initialUpdate := PriceUpdate{
		Type:   "initial",
		Prices: initialPrices,
	}

	if err := conn.WriteJSON(initialUpdate); err != nil {
		log.Println("Error sending initial prices:", err)
	}

	defer func() {
		clientsMutex.Lock()
		delete(clients, conn)
		clientsMutex.Unlock()
		conn.Close()
	}()

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// priceUpdateWorker updates prices periodically
func priceUpdateWorker() {
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		pricesMutex.Lock()
		updatedPrices := make(map[string]Stock)

		for symbol, stock := range prices {
			changePercent := (rand.Float64() - 0.5) * 0.02
			newPrice := stock.Price * (1 + changePercent)
			newPrice = float64(int(newPrice*100)) / 100

			stock.Price = newPrice
			stock.Change = changePercent * 100

			updatedPrices[symbol] = *stock
		}
		pricesMutex.Unlock()

		broadcast <- PriceUpdate{
			Type:   "update",
			Prices: updatedPrices,
		}
	}
}

// handleBroadcasts sends price updates to all connected clients
func handleBroadcasts() {
	for update := range broadcast {
		clientsMutex.RLock()
		for client := range clients {
			err := client.WriteJSON(update)
			if err != nil {
				log.Printf("WebSocket write error: %v", err)
				client.Close()
				clientsMutex.RUnlock()
				clientsMutex.Lock()
				delete(clients, client)
				clientsMutex.Unlock()
				clientsMutex.RLock()
			}
		}
		clientsMutex.RUnlock()
	}
}

// generateID generates a unique ID
func generateID() string {
	return time.Now().Format("20060102150405") + "-" + randString(8)
}

// generateOrderID generates a unique order ID
func generateOrderID() string {
	return "ORD-" + time.Now().Format("20060102150405") + "-" + randString(6)
}

// randString generates a random string of given length
func randString(n int) string {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}
