import app from './app.js';
import { connectMongoDB } from './config/mongodb.js';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Connect to MongoDB
        await connectMongoDB();
        
        // Start server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();