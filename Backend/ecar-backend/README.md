# E-Car Backend

Backend API for the car comparison platform with freemium model.

## Features

- User authentication with JWT
- Car comparison with limits for free users
- AI chat with daily limits for free users
- Saved comparisons (premium only)
- Razorpay payment integration
- MongoDB database

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env` and fill in the values:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `MONGODB_URI`: MongoDB connection string
   - `JWT_SECRET`: Secret key for JWT tokens
   - `RAZORPAY_KEY_ID`: Razorpay key ID
   - `RAZORPAY_KEY_SECRET`: Razorpay key secret
   - `ANTHROPIC_API_KEY`: Anthropic API key for AI chat

3. **Start MongoDB**
   Make sure MongoDB is running on your system.

4. **Run the Server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /user/login` - User login
- `POST /user/signup` - User registration

### Cars
- `GET /car/cars` - Get all cars
- `GET /car/car/:id` - Get car details

### Comparison
- `POST /compare/compare` - Perform car comparison
- `GET /compare/saved` - Get saved comparisons (premium)
- `DELETE /compare/saved/:id` - Delete saved comparison

### AI Chat
- `POST /ai/chat` - Send AI chat message
- `GET /ai/sessions` - Get chat sessions
- `POST /ai/sessions` - Create chat session
- `GET /ai/sessions/:id` - Get session messages
- `POST /ai/sessions/:id/messages` - Save message
- `DELETE /ai/sessions/:id` - Delete session

### Payment
- `POST /payment/create-order` - Create Razorpay order
- `POST /payment/verify-payment` - Verify payment
- `GET /payment/history` - Get payment history

## Example API Responses

### Comparison
```json
POST /compare/compare
{
  "carIds": ["64f1b2c3d4e5f6789abc123", "64f1b2c3d4e5f6789abc124"],
  "save": false
}

Response:
{
  "message": "Comparison performed successfully",
  "data": {
    "cars": [
      {
        "id": "64f1b2c3d4e5f6789abc123",
        "name": "Maruti Swift",
        "brand": "Maruti",
        "price": 650000,
        "mileage": 22,
        "engine": 1197,
        "seating": 5,
        "rating": 4.2
      }
    ],
    "metrics": {
      "price": [650000, 850000],
      "mileage": [22, 18],
      "engine": [1197, 1498],
      "seating": [5, 5],
      "rating": [4.2, 4.5]
    }
  },
  "remainingComparisons": 2
}
```

### AI Chat
```json
POST /ai/chat
{
  "messages": [
    {"role": "user", "content": "Best car under 8 lakh"}
  ],
  "carInventory": [...]
}

Response:
{
  "reply": "Based on your budget of under 8 lakh, here are the best matches..."
}
```

### Create Payment Order
```json
POST /payment/create-order

Response:
{
  "message": "Order created successfully",
  "orderId": "order_xyz123",
  "amount": 99900,
  "currency": "INR",
  "key": "rzp_test_xxx"
}
```

### Verify Payment
```json
POST /payment/verify-payment
{
  "razorpay_order_id": "order_xyz123",
  "razorpay_payment_id": "pay_abc456",
  "razorpay_signature": "signature..."
}

Response:
{
  "message": "Payment verified and user upgraded to premium",
  "success": true
}
```

## Limits

- **Free Users**:
  - 3 comparison sessions total
  - 5 AI messages per day
  - Cannot save comparisons

- **Premium Users**:
  - Unlimited comparisons
  - Unlimited AI messages
  - Can save unlimited comparisons

## Database Models

- **User**: name, email, password, role, isPro, compareCount, aiUsage
- **Payment**: userId, orderId, paymentId, amount, status
- **SavedComparison**: userId, name, cars, comparisonData
- **AIChatSession**: userId, title, messages
- **Car**: car details
- **Review**: car reviews
- **Wishlist**: user wishlists