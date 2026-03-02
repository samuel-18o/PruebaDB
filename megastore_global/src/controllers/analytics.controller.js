import pool from '../config/database.js';
import { getDB } from '../config/mongodb.js';

class AnalyticsController {
    
    // 1. Supplier Analysis
    static async getSupplierAnalysis(req, res, next) {
        try {
            // Get suppliers with product count from PostgreSQL
            const suppliersQuery = `
                SELECT 
                    s.id,
                    s.name,
                    s.contact,
                    COUNT(p.id) AS product_count,
                    SUM(p.unit_price) AS total_product_value
                FROM suppliers s
                LEFT JOIN products p ON s.id = p.supplier_id
                GROUP BY s.id, s.name, s.contact
                ORDER BY total_product_value DESC
            `;
            
            const suppliersResult = await pool.query(suppliersQuery);
            
            // Get order totals from MongoDB
            const db = getDB();
            const ordersCollection = db.collection('orders');
            
            const supplierAnalysis = await Promise.all(
                suppliersResult.rows.map(async (supplier) => {
                    // Get products for this supplier
                    const productsQuery = `
                        SELECT id FROM products WHERE supplier_id = $1
                    `;
                    const productsResult = await pool.query(productsQuery, [supplier.id]);
                    const productIds = productsResult.rows.map(p => p.id);
                    
                    // Get orders for these products
                    const orders = await ordersCollection.find({}).toArray();
                    
                    let totalQuantity = 0;
                    let totalValue = 0;
                    
                    orders.forEach(order => {
                        order.items.forEach(item => {
                            if (productIds.includes(item.product_id)) {
                                totalQuantity += item.quantity;
                                totalValue += item.subtotal;
                            }
                        });
                    });
                    
                    return {
                        supplier_id: supplier.id,
                        supplier_name: supplier.name,
                        supplier_contact: supplier.contact,
                        products_in_catalog: parseInt(supplier.product_count),
                        total_items_sold: totalQuantity,
                        total_inventory_value: parseFloat(supplier.total_product_value || 0).toFixed(2),
                        total_sales_value: totalValue.toFixed(2)
                    };
                })
            );
            
            res.status(200).json({
                success: true,
                message: 'Supplier analysis completed',
                data: supplierAnalysis
            });
            
        } catch (error) {
            next(error);
        }
    }
    
    // 2. Customer Purchase History
    static async getCustomerHistory(req, res, next) {
        try {
            const { customerId } = req.params;
            
            if (!customerId) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer ID is required'
                });
            }
            
            // Get customer info from PostgreSQL
            const customerQuery = 'SELECT * FROM customers WHERE id = $1';
            const customerResult = await pool.query(customerQuery, [customerId]);
            
            if (customerResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found'
                });
            }
            
            const customer = customerResult.rows[0];
            
            // Get orders from MongoDB
            const db = getDB();
            const ordersCollection = db.collection('orders');
            
            const orders = await ordersCollection
                .find({ customer_id: parseInt(customerId) })
                .sort({ order_date: -1 })
                .toArray();
            
            const purchaseHistory = {
                customer: {
                    id: customer.id,
                    name: customer.full_name,
                    email: customer.email,
                    address: customer.address
                },
                total_orders: orders.length,
                total_spent: orders.reduce((sum, order) => sum + order.total_amount, 0).toFixed(2),
                orders: orders.map(order => ({
                    transaction_id: order.transaction_id,
                    order_date: order.order_date,
                    items: order.items,
                    total_amount: order.total_amount.toFixed(2)
                }))
            };
            
            res.status(200).json({
                success: true,
                data: purchaseHistory
            });
            
        } catch (error) {
            next(error);
        }
    }
    
    // 3. Top Products by Category
    static async getTopProductsByCategory(req, res, next) {
        try {
            const { categoryName } = req.params;
            
            if (!categoryName) {
                return res.status(400).json({
                    success: false,
                    message: 'Category name is required'
                });
            }
            
            // Get products in category from PostgreSQL
            const productsQuery = `
                SELECT p.id, p.sku, p.name, p.unit_price, c.name AS category
                FROM products p
                JOIN categories c ON p.category_id = c.id
                WHERE LOWER(c.name) = LOWER($1)
            `;
            
            const productsResult = await pool.query(productsQuery, [categoryName]);
            
            if (productsResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `No products found in category: ${categoryName}`
                });
            }
            
            const productIds = productsResult.rows.map(p => p.id);
            
            // Get sales data from MongoDB
            const db = getDB();
            const ordersCollection = db.collection('orders');
            
            const orders = await ordersCollection.find({}).toArray();
            
            // Process sales data
            const salesMap = {};
            orders.forEach(order => {
                order.items.forEach(item => {
                    if (productIds.includes(item.product_id)) {
                        if (!salesMap[item.product_id]) {
                            salesMap[item.product_id] = {
                                sku: item.sku,
                                product_name: item.product_name,
                                total_quantity_sold: 0,
                                total_revenue: 0
                            };
                        }
                        salesMap[item.product_id].total_quantity_sold += item.quantity;
                        salesMap[item.product_id].total_revenue += item.subtotal;
                    }
                });
            });
            
            const topProducts = Object.entries(salesMap)
                .map(([productId, data]) => {
                    const product = productsResult.rows.find(p => p.id === parseInt(productId));
                    return {
                        product_id: parseInt(productId),
                        sku: data.sku,
                        product_name: data.product_name,
                        category: categoryName,
                        unit_price: product?.unit_price || 0,
                        quantity_sold: data.total_quantity_sold,
                        total_revenue: data.total_revenue.toFixed(2)
                    };
                })
                .sort((a, b) => parseFloat(b.total_revenue) - parseFloat(a.total_revenue));
            
            res.status(200).json({
                success: true,
                category: categoryName,
                total_products: topProducts.length,
                data: topProducts
            });
            
        } catch (error) {
            next(error);
        }
    }
}

export default AnalyticsController;