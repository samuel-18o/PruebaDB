import express from 'express';
import AnalyticsController from '../controllers/analytics.controller.js';

const router = express.Router();

// Analytics Routes
router.get('/suppliers', AnalyticsController.getSupplierAnalysis);
router.get('/customers/:customerId/history', AnalyticsController.getCustomerHistory);
router.get('/products/top-by-category/:categoryName', AnalyticsController.getTopProductsByCategory);

export default router;