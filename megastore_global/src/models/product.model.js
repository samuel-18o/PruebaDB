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
        const { name, unit_price, category_id, supplier_id } = productData;
        
        const query = `
            UPDATE products
            SET name = $1, unit_price = $2, category_id = $3, supplier_id = $4
            WHERE id = $5
            RETURNING *
        `;
        
        const result = await pool.query(query, [name, unit_price, category_id, supplier_id, id]);
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