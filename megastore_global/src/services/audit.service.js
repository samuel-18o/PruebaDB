import { getDB } from '../config/mongodb.js';

class AuditService {

    static async logDeletion(entityType, entityId, deletedData, deleteBy = 'system') {
        const db = getDB();
        const auditCollection = db.collection('audit_logs');
        
        const auditLog = {
            entity_type: entityType,
            entity_id: entityId,
            operation: 'DELETE',
            deleted_data: deletedData,
            deleted_by: deletedBy,
            deleted_at: new Date()
        };
        
        const result = await auditCollection.insertOne(auditLog);
        return result;
    }

    static async getAuditLogs(entityType, entityId) {
        const db = getDB();
        const auditCollection = db.collection('audit_logs');
        
        const query = {};
        if (entityType) query.entity_type = entityType;
        if (entityId) query.entity_id = entityId;
        
        const logs = await auditCollection
            .find(query)
            .sort({ deleted_at: -1 })
            .toArray();
        
        return logs;
    }
}

export default AuditService;