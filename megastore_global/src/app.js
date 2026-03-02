import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'MegaStore API - v1.0',
        status: 'active',
        endpoints: {
            products: '/api/products',
            analytics: '/api/analytics'
        }
    });
});

// Import routes
import productRoutes from './routes/product.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

app.use('/api/products', productRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
            status: err.status || 500
        }
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: 'Route not found',
            status: 404
        }
    });
});

export default app;