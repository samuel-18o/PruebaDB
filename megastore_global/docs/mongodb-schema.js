db = db.getSiblingDB('db_megastore_exam');

db.orders.drop();
db.audit_logs.drop();

db.createCollection("orders", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["transaction_id", "order_date", "customer_id", "items", "total_amount"],
            properties: {
                transaction_id: {
                    bsonType: "string",
                    description: "Unique transaction ID - required"
                },
                order_date: {
                    bsonType: "date",
                    description: "Date of the order - required"
                },
                customer_id: {
                    bsonType: "int",
                    description: "Reference to PostgreSQL customer ID - required"
                },
                items: {
                    bsonType: "array",
                    minItems: 1,
                    description: "Array of order items - required",
                    items: {
                        bsonType: "object",
                        required: ["product_id", "sku", "product_name", "unit_price", "quantity", "subtotal"],
                        properties: {
                            product_id: {
                                bsonType: "int",
                                description: "Reference to PostgreSQL product ID"
                            },
                            sku: {
                                bsonType: "string",
                                description: "Product SKU"
                            },
                            product_name: {
                                bsonType: "string",
                                description: "Product name snapshot"
                            },
                            unit_price: {
                                bsonType: "double",
                                minimum: 0,
                                description: "Price at the time of purchase"
                            },
                            quantity: {
                                bsonType: "int",
                                minimum: 1,
                                description: "Quantity ordered"
                            },
                            subtotal: {
                                bsonType: "double",
                                minimum: 0,
                                description: "Item subtotal (unit_price * quantity)"
                            }
                        }
                    }
                },
                total_amount: {
                    bsonType: "double",
                    minimum: 0,
                    description: "Total order amount - required"
                },
                created_at: {
                    bsonType: "date",
                    description: "Timestamp of order creation"
                }
            }
        }
    }
});

db.orders.createIndex({ "transaction_id": 1 }, { unique: true });

db.orders.createIndex({ "customer_id": 1 });

db.orders.createIndex({ "order_date": -1 });

db.createCollection("audit_logs", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["entity_type", "entity_id", "operation", "deleted_at"],
            properties: {
                entity_type: {
                    bsonType: "string",
                    enum: ["product", "customer", "supplier", "category", "order"],
                    description: "Type of entity"
                },
                entity_id: {
                    bsonType: ["int", "string"],
                    description: "ID of the deleted entity"
                },
                operation: {
                    bsonType: "string",
                    enum: ["DELETE", "UPDATE", "CREATE"],
                    description: "Type of operation"
                },
                deleted_data: {
                    bsonType: "object",
                    description: "Snapshot of deleted/modified data"
                },
                deleted_by: {
                    bsonType: "string",
                    description: "User or system that performed the action"
                },
                deleted_at: {
                    bsonType: "date",
                    description: "Timestamp of deletion"
                }
            }
        }
    }
});

db.audit_logs.createIndex({ "entity_type": 1, "entity_id": 1 });
db.audit_logs.createIndex({ "deleted_at": -1 });

print("MongoDB collections created with validation schemas");