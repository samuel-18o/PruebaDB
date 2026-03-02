import fs from 'fs';
import csv from 'csv-parser';
import pool from '../src/config/database.js';
import { connectMongoDB, getDB } from '../src/config/mongodb.js';
import { Int32, Double } from 'mongodb';

async function getOrCreateCustomer(name, email, address) {
    const client = await pool.connect();
    try {
        // Check if customer exists
        const checkQuery = 'SELECT id FROM customers WHERE email = $1';
        const checkResult = await client.query(checkQuery, [email]);
        
        if (checkResult.rows.length > 0) {
            return checkResult.rows[0].id;
        }
        
        // Create new customer
        const insertQuery = `
            INSERT INTO customers (full_name, email, address) 
            VALUES ($1, $2, $3) 
            RETURNING id
        `;
        const insertResult = await client.query(insertQuery, [name, email, address]);
        return insertResult.rows[0].id;
    } finally {
        client.release();
    }
}

async function getOrCreateCategory(name) {
    const client = await pool.connect();
    try {
        const checkQuery = 'SELECT id FROM categories WHERE name = $1';
        const checkResult = await client.query(checkQuery, [name]);
        
        if (checkResult.rows.length > 0) {
            return checkResult.rows[0].id;
        }
        
        const insertQuery = 'INSERT INTO categories (name) VALUES ($1) RETURNING id';
        const insertResult = await client.query(insertQuery, [name]);
        return insertResult.rows[0].id;
    } finally {
        client.release();
    }
}

async function getOrCreateSupplier(name, contact) {
    const client = await pool.connect();
    try {
        const checkQuery = 'SELECT id FROM suppliers WHERE name = $1';
        const checkResult = await client.query(checkQuery, [name]);
        
        if (checkResult.rows.length > 0) {
            return checkResult.rows[0].id;
        }
        
        const insertQuery = `
            INSERT INTO suppliers (name, contact) 
            VALUES ($1, $2) 
            RETURNING id
        `;
        const insertResult = await client.query(insertQuery, [name, contact]);
        return insertResult.rows[0].id;
    } finally {
        client.release();
    }
}

async function getOrCreateProduct(sku, name, price, categoryId, supplierId) {
    const client = await pool.connect();
    try {
        const checkQuery = 'SELECT id FROM products WHERE sku = $1';
        const checkResult = await client.query(checkQuery, [sku]);
        
        if (checkResult.rows.length > 0) {
            return checkResult.rows[0].id;
        }
        
        const insertQuery = `
            INSERT INTO products (sku, name, unit_price, category_id, supplier_id) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING id
        `;
        const insertResult = await client.query(insertQuery, [sku, name, price, categoryId, supplierId]);
        return insertResult.rows[0].id;
    } finally {
        client.release();
    }
}

async function createOrder(transactionId, orderDate, customerId, productId, sku, productName, unitPrice, quantity) {
    const db = getDB();
    const ordersCollection = db.collection('orders');
    
    // Check if order already exists
    const existingOrder = await ordersCollection.findOne({ transaction_id: transactionId });
    
    if (existingOrder) {
        console.log(`Order ${transactionId} already exists. Skipping...`);
        return;
    }
    
    const subtotal = unitPrice * quantity;
    
    const order = {
        transaction_id: transactionId,
        order_date: new Date(orderDate),
        customer_id: new Int32(customerId),
        items: [
            {
                product_id: new Int32(productId),
                sku: sku,
                product_name: productName,
                unit_price: new Double(unitPrice),
                quantity: new Int32(quantity),
                subtotal: new Double(subtotal)
            }
        ],
        total_amount: new Double(subtotal),
        created_at: new Date()
    };
    
    await ordersCollection.insertOne(order);
    console.log(`Order ${transactionId} created successfully`);
}

async function migrateData() {
    console.log('Starting data migration...\n');
    
    try {
        // Connect to databases
        await connectMongoDB();
        
        const records = [];
        
        // Read CSV file
        console.log('Reading CSV file...');
        await new Promise((resolve, reject) => {
            fs.createReadStream('./data/raw-transactions.csv')
                .pipe(csv())
                .on('data', (data) => records.push(data))
                .on('end', resolve)
                .on('error', reject);
        });
        
        console.log(`Found ${records.length} records\n`);
        
        // Process each record
        let successCount = 0;
        let errorCount = 0;
        
        for (const record of records) {
            try {
                console.log(`Processing transaction: ${record.transaction_id}`);
                
                // 1. Get or create customer
                const customerId = await getOrCreateCustomer(
                    record.customer_name,
                    record.customer_email,
                    record.customer_address
                );
                console.log(`Customer: ${record.customer_name} (ID: ${customerId})`);
                
                // 2. Get or create category (using product_category from CSV)
                const categoryId = await getOrCreateCategory(record.product_category);
                console.log(`Category: ${record.product_category} (ID: ${categoryId})`);
                
                // 3. Get or create supplier (using supplier_email from CSV)
                const supplierId = await getOrCreateSupplier(
                    record.supplier_name,
                    record.supplier_email
                );
                console.log(`Supplier: ${record.supplier_name} (ID: ${supplierId})`);
                
                // 4. Get or create product (using product_sku from CSV)
                const productId = await getOrCreateProduct(
                    record.product_sku,
                    record.product_name,
                    parseFloat(record.unit_price),
                    categoryId,
                    supplierId
                );
                console.log(`Product: ${record.product_name} (ID: ${productId})`);
                
                // 5. Create order in MongoDB (using date from CSV)
                await createOrder(
                    record.transaction_id,
                    record.date,
                    customerId,
                    productId,
                    record.product_sku,
                    record.product_name,
                    parseFloat(record.unit_price),
                    parseInt(record.quantity)
                );
                
                successCount++;
                
            } catch (error) {
                console.error(`Error processing ${record.transaction_id}:`, error.message);
                errorCount++;
            }
        }
        
        console.log(`Successful: ${successCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log(`Total: ${records.length}`);
        
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

// Run migration
migrateData();