# Baeby E-Commerce Platform - GitHub Setup Guide

## Quick Start

### 1. Create a New GitHub Repository
- Go to https://github.com/new
- Name it: `baeby-clothing-brand`
- Choose "Private" or "Public"
- Click "Create repository"

### 2. Clone and Push Code

```bash
# Clone your new repository
git clone https://github.com/YOUR_USERNAME/baeby-clothing-brand.git
cd baeby-clothing-brand

# Copy all files from this package into the directory
# (Copy the contents of the baeby-github folder here)

# Add and commit
git add .
git commit -m "Initial commit: Baeby e-commerce platform"

# Push to GitHub
git push -u origin main
```

### 3. Install Dependencies

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install project dependencies
pnpm install

# Push the lock file update
git add pnpm-lock.yaml
git commit -m "Update pnpm lock file"
git push
```

### 4. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL=your_database_url

# OAuth (Manus)
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# JWT
JWT_SECRET=your_jwt_secret_key

# Owner Info
OWNER_NAME=Your Name
OWNER_OPEN_ID=your_open_id

# Forge API (Manus built-in)
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_forge_api_key
VITE_FRONTEND_FORGE_API_KEY=your_frontend_forge_api_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im

# Analytics
VITE_ANALYTICS_ENDPOINT=your_analytics_endpoint
VITE_ANALYTICS_WEBSITE_ID=your_website_id
```

### 5. Run Locally

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Project Structure

```
baeby-clothing-brand/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   └── lib/           # Utilities
│   └── public/            # Static assets
├── server/                # Express backend
│   ├── routers/           # tRPC routers
│   │   ├── orders.ts      # Order management
│   │   ├── payment.ts     # Bank transfer payments
│   │   ├── admin.ts       # Admin dashboard
│   │   └── webhooks.ts    # Webhook handlers
│   └── _core/             # Core server utilities
├── drizzle/               # Database schema
├── shared/                # Shared types
└── package.json           # Dependencies
```

## Key Features

✅ **Checkout System** - Full order creation with delivery details  
✅ **Bank Transfer Payments** - Card details collection and processing  
✅ **Admin Dashboard** - Order management and profit tracking  
✅ **Database** - Orders, customers, and profit ledger  
✅ **61 Unit Tests** - All critical functionality tested  
✅ **Role-Based Access** - Admin-only dashboard access  

## Database Schema

The application uses the following tables:

- **users** - User authentication
- **customers** - Customer information
- **orders** - Order records with totals and status
- **orderItems** - Products in each order
- **profitLedger** - Profit tracking to account 1996092373

## API Endpoints (tRPC)

### Orders
- `orders.createOrder` - Create new order
- `orders.getOrder` - Retrieve order details
- `orders.getOrderByNumber` - Get by order number

### Payments
- `payment.processBankTransfer` - Process bank transfer
- `payment.getPaymentInstructions` - Get bank details
- `payment.verifyPaymentStatus` - Check payment status

### Admin
- `admin.getDashboardStats` - Dashboard statistics
- `admin.getOrders` - List orders with pagination
- `admin.getProfitLedger` - Profit tracking
- `admin.updateOrderStatus` - Update order status

## Deployment

### Option 1: Manus (Recommended)
The code is built for Manus deployment. Use the Manus Management UI to publish.

### Option 2: Other Platforms
- **Vercel**: Push to GitHub, connect Vercel, auto-deploys
- **Railway**: Connect GitHub repo, auto-deploys
- **Render**: Similar to Railway
- **Self-hosted**: Use `pnpm build` and deploy to your server

## Business Logic

- **Profit Margin**: R150 per order
- **Tax**: 15% on (subtotal + profit)
- **Profit Account**: 1996092373
- **Shipping**: 10-20 working days via Buffalo Logistics

## Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/routers/orders.test.ts

# Watch mode
pnpm test --watch
```

## Support

For issues or questions:
- Email: support@baeby.co.za
- WhatsApp: 066 564 7535

## License

MIT License - Feel free to use and modify as needed.
