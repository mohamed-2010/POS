#!/bin/bash
# Run database migrations for POS Backend

# Database configuration
DB_NAME="pos_db"
DB_USER="root"

echo "========================================"
echo "Running Backend Database Migrations"
echo "========================================"

# Check if database exists
echo "Checking database: $DB_NAME"
mysql -u $DB_USER -p -e "USE $DB_NAME" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ Database $DB_NAME does not exist!"
    echo "Creating database..."
    mysql -u $DB_USER -p -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
fi

# Run migrations in order
echo ""
echo "Running migration 001_initial_schema.sql..."
mysql -u $DB_USER -p $DB_NAME < src/database/migrations/001_initial_schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration 001 completed"
else
    echo "❌ Migration 001 failed"
    exit 1
fi

echo ""
echo "Running migration 002_entity_tables.sql..."
mysql -u $DB_USER -p $DB_NAME < src/database/migrations/002_entity_tables.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration 002 completed"
else
    echo "❌ Migration 002 failed"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ All migrations completed successfully!"
echo "========================================"
echo ""
echo "Verify tables:"
mysql -u $DB_USER -p $DB_NAME -e "SHOW TABLES;"
