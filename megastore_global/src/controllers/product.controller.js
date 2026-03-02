import ProductModel from '../models/product.model.js';

class ProductController {
    
    // GET /api/products
    static async getAllProducts(req, res, next) {
        try {
            const products = await ProductModel.getAll();
            res.status(200).json({
                success: true,
                count: products.length,
                data: products
            });
        } catch (error) {
            next(error);
        }
    }
    
    // GET /api/products/:id
    static async getProductById(req, res, next) {
        try {
            const { id } = req.params;
            const product = await ProductModel.getById(id);
            
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            
            res.status(200).json({
                success: true,
                data: product
            });
        } catch (error) {
            next(error);
        }
    }
    
    // POST /api/products
    static async createProduct(req, res, next) {
        try {
            const productData = req.body;
            
            // Validation
            const requiredFields = ['sku', 'name', 'unit_price', 'category_id', 'supplier_id'];
            for (const field of requiredFields) {
                if (!productData[field]) {
                    return res.status(400).json({
                        success: false,
                        message: `Missing required field: ${field}`
                    });
                }
            }
            
            const newProduct = await ProductModel.create(productData);
            
            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: newProduct
            });
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                return res.status(409).json({
                    success: false,
                    message: 'Product with this SKU already exists'
                });
            }
            next(error);
        }
    }
    
    // PUT /api/products/:id
    static async updateProduct(req, res, next) {
        try {
            const { id } = req.params;
            const productData = req.body;
            
            const updatedProduct = await ProductModel.update(id, productData);
            
            if (!updatedProduct) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            
            res.status(200).json({
                success: true,
                message: 'Product updated successfully',
                data: updatedProduct
            });
        } catch (error) {
            next(error);
        }
    }
    
    // DELETE /api/products/:id
    static async deleteProduct(req, res, next) {
        try {
            const { id } = req.params;
            
            const result = await ProductModel.delete(id);
            
            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            
            res.status(200).json({
                success: true,
                message: 'Product deleted successfully',
                data: result.deleted
            });
        } catch (error) {
            next(error);
        }
    }
}

export default ProductController;