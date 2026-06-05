# Sportify

Sportify is a multi-page online sports store built with Node.js, Express, and MongoDB. The app includes a storefront for browsing clothing, equipment, and accessories, a client-side cart and checkout flow, and an admin dashboard for order management and analytics.

## Features

- Multi-category storefront pages: Clothing, Equipment, Accessories
- Add-to-cart experience with local storage persistence
- Checkout flow with customer details and order submission
- Admin dashboard with secure login and order status updates
- Dynamic product sorting powered by backend query parameters
- MongoDB-backed data models using Mongoose

## Tech stack

- Node.js
- Express
- MongoDB / Mongoose
- HTML, CSS, JavaScript
- bcryptjs for password hashing
- jsonwebtoken for admin authentication

## Installation

```bash
cd "c:/Users/sabih/Desktop/Project"
npm install
```

## Database setup

Start MongoDB locally, then seed the project data:

```bash
node seed.js
```

The seed script creates:

- categories for clothing, equipment, accessories
- sample products
- a demo user
- an admin user
- a sample order and cart entry

## Run the app

```bash
npm start
```

Open the app in your browser:

```text
http://localhost:3000
```

## Pages

- `/` — Home page
- `/clothing` — Clothing category
- `/equipment` — Equipment category
- `/accessories` — Accessories category
- `/checkout` — Checkout page
- `/order-success` — Order confirmation
- `/admin` — Admin dashboard

## Admin login

After seeding, use these default credentials:

- Email: `admin@example.com`
- Password: `admin123`

## Environment variables

Optional environment variables:

- `MONGODB_URI` — MongoDB connection string
- `DB_NAME` — database name (default: `sportify-multi-page-store`)
- `PORT` — server port (default: `3000`)
- `JWT_SECRET` — JSON Web Token secret (default: `dev_secret_change_me`)
- `ADMIN_EMAIL` / `ADMIN_PASS` — custom admin account values

## Project structure

- `server.js` — Express server, routes, admin authentication, API endpoints
- `auth.js` — JWT token generation and middleware
- `seed.js` — seed data script for MongoDB
- `main.js` — storefront client logic and cart functionality
- `admin-panel.js` — admin dashboard behavior and order management
- `style.css` — site styling for storefront and admin pages
- `models/` — Mongoose models for Category, Product, User, Cart, Order
- `index.html`, `clothing.html`, `equipment.html`, `accessories.html`, `checkout.html`, `success.html`, `admin.html` — page templates
- `images/` — static image assets

## GitHub setup

Create a repository and push your code:

```bash
git init
git add .
git commit -m "Initial Sportify project commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

## Notes

- Keep `node_modules/` out of version control by using `.gitignore`
- Use `npm install` after cloning the repo to restore dependencies
- If you change admin credentials, update `seed.js` or set `ADMIN_EMAIL` / `ADMIN_PASS`
