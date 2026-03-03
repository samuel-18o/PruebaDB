import pool from '../config/database.js';

class ProductModel {

    // Get all products with details
    static async getAll() {
        const query = `
            SELECT 
                p.id,
                p.sku,
                p.name AS product_name,
                p.unit_price,
                c.name AS category_name,
                s.name AS supplier_name,
                s.contact AS supplier_contact,
                p.created_at
            FROM products p
            JOIN categories c ON p.category_id = c.id
            JOIN suppliers s ON p.supplier_id = s.id
            ORDER BY p.created_at DESC
        `;
        
        const result = await pool.query(query);
        return result.rows;
    }

    // Get product by ID
    static async getById(id) {
        const query = `
            SELECT 
                p.*,
                c.name AS category_name,
                s.name AS supplier_name,
                s.contact AS supplier_contact
            FROM products p
            JOIN categories c ON p.category_id = c.id
            JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id = $1
        `;
        
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }
    
    // Create product
    static async create(productData) {
        const { sku, name, unit_price, category_id, supplier_id } = productData;
        
        const query = `
            INSERT INTO products (sku, name, unit_price, category_id, supplier_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const result = await pool.query(query, [sku, name, unit_price, category_id, supplier_id]);
        return result.rows[0];
    }
    
    // Update product
    static async update(id, productData) {
        // Build dynamic query to update only provided fields
        const fields = [];
        const values = [];
        let paramCount = 1;
        
        // Only include fields that are actually provided
        if (productData.name !== undefined) {
            fields.push(`name = $${paramCount++}`);
            values.push(productData.name);
        }
        
        if (productData.unit_price !== undefined) {
            fields.push(`unit_price = $${paramCount++}`);
            values.push(productData.unit_price);
        }
        
        if (productData.category_id !== undefined) {
            fields.push(`category_id = $${paramCount++}`);
            values.push(productData.category_id);
        }
        
        if (productData.supplier_id !== undefined) {
            fields.push(`supplier_id = $${paramCount++}`);
            values.push(productData.supplier_id);
        }
        
        if (productData.sku !== undefined) {
            fields.push(`sku = $${paramCount++}`);
            values.push(productData.sku);
        }
        
        // If no valid fields to update, return null
        if (fields.length === 0) {
            return null;
        }
        
        // Add the id as the last parameter
        values.push(id);
        
        const query = `
            UPDATE products
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;
        
        const result = await pool.query(query, values);
        return result.rows[0];
    }
    
    // Delete product (with audit log)
    static async delete(id) {
        // First get the product data for audit
        const product = await this.getById(id);
        
        if (!product) {
            return null;
        }
        
        // Delete from PostgreSQL
        const query = 'DELETE FROM products WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        
        return { deleted: result.rows[0], original: product };
    }
}

export default ProductModel;