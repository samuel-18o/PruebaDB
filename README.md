# MegaStore Database Migration Project

## Project Overview

This project demonstrates a complete database migration from a flat CSV file to a modern, scalable architecture using both SQL (PostgreSQL) and NoSQL (MongoDB) databases, with a RESTful API built with Express.js.

## Architecture

### Database Distribution

#### PostgreSQL (Relational)
- **customers**: Master customer data
- **suppliers**: Supplier information
- **categories**: Product categories
- **products**: Product catalog with references

#### MongoDB (NoSQL)
- **orders**: Transactional data with embedded items

### Justification

**SQL for Master Data:**
- Strong referential integrity required
- ACID compliance for critical data
- Complex relationships (products → categories, suppliers)
- Normalization to 3NF eliminates redundancy

**NoSQL for Transactions:**
- High write volume for orders
- Embedded items optimize read performance
- Flexible schema for evolving requirements

## Installation & Setup

### Prerequisites
```bash
- Node.js >= 18.x
- PostgreSQL >= 14.x
- MongoDB >= 6.x
- npm
```

### 1. Clone Repository
```bash
git clone <repository-url>
cd megastore-project
```

### 2. Install Dependencies
`/PruebaDB/megastore_global`
```bash
npm install
```

### 3. Configure Environment
Create `.env` file:
```env
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=db_megastore_exam
PG_USER=megastore_user
PG_PASSWORD=megastore_pass

MONGO_URI=mongodb://localhost:27017/db_megastore_exam

PORT=3000
NODE_ENV=development
```

### 4. Setup Databases

**PostgreSQL:**
```bash
sudo -u postgres psql
CREATE USER megastore_user WITH PASSWORD 'megastore_pass';
CREATE DATABASE db_megastore_exam OWNER megastore_user;
\q

psql -h localhost -U megastore_user -d db_megastore_exam -f docs/sql-schema.sql
```

**MongoDB:**
```bash
mongosh < docs/mongodb-schema.js
```

### 5. Run Data Migration
```bash
npm run migrate
```

### 6. Start Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Project Structure

```
megastore-project/
├── data/
│   └── raw-transactions.csv      # Sample data
├── docs/
│   ├── sql-schema.sql            # PostgreSQL DDL
│   ├── mongodb-schema.js         # MongoDB validation
│   └── DER.pdf                   # ER diagram
├── scripts/
│   ├── migrate-data.js           # Data migration script
│   └── grant-permissions.sql
├── src/
│   ├── config/
│   │   ├── database.js           # PostgreSQL connection
│   │   └── mongodb.js            # MongoDB connection
│   ├── controllers/
│   │   ├── product.controller.js     # Product endpoints
│   │   └── analytics.controller.js   # Analytics endpoints
│   ├── models/
│   │   └── product.model.js      # Product data access
│   ├── routes/
│   │   ├── product.routes.js
│   │   └── analytics.routes.js
│   ├── services/
│   │   └── audit.service.js      # Audit logging
│   ├── app.js                    # Express app setup
│   └── server.js                 # Server entry point
├── .env                          # Environment variables
├── .gitignore
└── package.json

```

## Data Model

### SQL Schema (3NF)

**1NF:** All attributes are atomic (no multi-valued attributes)
**2NF:** No partial dependencies (all non-key attributes depend on the whole primary key)
**3NF:** No transitive dependencies (non-key attributes don't depend on other non-key attributes)

### MongoDB Schema

**Embedding Strategy:**
- Order items are embedded (read optimization)
- Customer/Product IDs are referenced (data consistency)

**Indexing:**
- `transaction_id`: Unique index for order tracking

## Database Tables

### PostgreSQL Tables

#### 1. customers
Master table for customer information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incremented customer ID |
| full_name | VARCHAR(255) | NOT NULL | Customer's full name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Customer's email address |
| address | TEXT | - | Customer's physical address |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

#### 2. suppliers
Supplier master data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incremented supplier ID |
| name | VARCHAR(255) | UNIQUE, NOT NULL | Supplier's company name |
| contact | VARCHAR(255) | - | Contact information |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

#### 3. categories
Product category catalog.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incremented category ID |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Category name |

#### 4. products
Product catalog with foreign key relationships.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incremented product ID |
| sku | VARCHAR(50) | UNIQUE, NOT NULL | Stock keeping unit (unique identifier) |
| name | VARCHAR(255) | NOT NULL | Product name |
| unit_price | DECIMAL(10,2) | NOT NULL, CHECK >= 0 | Product unit price |
| category_id | INTEGER | NOT NULL, FK → categories(id) | Reference to category |
| supplier_id | INTEGER | NOT NULL, FK → suppliers(id) | Reference to supplier |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

**Foreign Keys:**
- `category_id` → `categories(id)` ON DELETE RESTRICT
- `supplier_id` → `suppliers(id)` ON DELETE RESTRICT

### MongoDB Collections

#### 1. orders
Transactional data with embedded order items.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| transaction_id | string | Yes | Unique transaction identifier |
| order_date | date | Yes | Date when the order was placed |
| customer_id | int | Yes | Reference to PostgreSQL customer ID |
| items | array | Yes | Array of embedded order items (min 1) |
| items[].product_id | int | Yes | Reference to PostgreSQL product ID |
| items[].sku | string | Yes | Product SKU snapshot |
| items[].product_name | string | Yes | Product name at time of purchase |
| items[].unit_price | double | Yes | Price at time of purchase (≥ 0) |
| items[].quantity | int | Yes | Quantity ordered (≥ 1) |
| items[].subtotal | double | Yes | Item subtotal (unit_price × quantity) |
| total_amount | double | Yes | Total order amount (≥ 0) |
| created_at | date | No | Timestamp of order creation |

**Indexes:**
- `transaction_id`: Unique index
- `customer_id`: Non-unique index
- `order_date`: Descending index

#### 2. audit_logs
Audit trail for database operations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| entity_type | string | Yes | Type of entity (product, customer, supplier, category, order) |
| entity_id | int/string | Yes | ID of the affected entity |
| operation | string | Yes | Operation type (DELETE, UPDATE, CREATE) |
| deleted_data | object | No | Snapshot of deleted/modified data |
| deleted_by | string | No | User or system that performed the action |
| deleted_at | date | Yes | Timestamp of the operation |

**Indexes:**
- `entity_type + entity_id`: Compound index
- `deleted_at`: Descending index

## API Endpoints

### Products (CRUD)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| GET | `/api/products/:id` | Get product by ID |
| POST | `/api/products` | Create new product (validates required fields) |
| PUT | `/api/products/:id` | Update product (partial updates supported) |
| DELETE | `/api/products/:id` | Delete product |

### Analytics (Business Intelligence)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/suppliers` | Supplier performance analysis |
| GET | `/api/analytics/customers/:id/history` | Customer purchase history |
| GET | `/api/analytics/products/top-by-category/:category` | Best-selling products |

## Migration Process

The migration script (`scripts/migrate-data.js`) implements **idempotency**:

1. **Check existence** before creating customers/suppliers/products
2. **Reuse existing IDs** for duplicate entities
3. **Skip duplicate orders** using unique transaction_id

## Testing with Postman

Import: `megastore_global/postman.json`

Includes:
- CRUD operations (GET, POST, PUT, DELETE)
- Analytics queries (suppliers, customers, top products)
