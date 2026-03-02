import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let db;

async function connectMongoDB() {
    try {
        await client.connect();
        db = client.db('db_megastore_exam');
        console.log('Connected to MongoDB database');
        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

function getDB() {
    if (!db) {
        throw new Error('Database not initialized. Call connectMongoDB first.');
    }
    return db;
}

export { connectMongoDB, getDB, client };