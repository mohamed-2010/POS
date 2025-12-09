#!/bin/bash
# Run Complete Database Migration
# This script executes all migration parts in order

echo "========================================"
echo "Complete POS Database Migration"
echo "========================================"

DB_NAME="pos_db"
DB_USER="root"

echo "⚠️  WARNING: This will create ~30 new tables in $DB_NAME"
echo "Make sure you have a backup before proceeding!"
echo ""
read -p "Continue? (yes/no): " confirm

if [[ $confirm != "yes" ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "Running Part 1 (Core, Product, Invoice, Payment tables)..."
mysql -u $DB_USER -p $DB_NAME < complete-migration-part1.sql

if [ $? -ne 0 ]; then
    echo "❌ Part 1 failed"
    exit 1
fi

echo "✅ Part 1 completed"
echo ""
echo "Running Part 2 (Purchase, Expense, Employee, Shift tables)..."
mysql -u $DB_USER -p $DB_NAME < complete-migration-part2.sql

if [ $? -ne 0 ]; then
    echo "❌ Part 2 failed"
    exit 1
fi

echo "✅ Part 2 completed"
echo ""
echo "Running Part 3 (Cash, Deposits, Restaurant, System, WhatsApp tables)..."
mysql -u $DB_USER -p $DB_NAME < complete-migration-part3.sql

if [ $? -ne 0 ]; then
    echo "❌ Part 3 failed"
    exit 1
fi

echo "✅ Part 3 completed"
echo ""
echo "========================================"
echo "✅ Complete migration finished successfully!"
echo "========================================"
echo ""
echo "Total tables in database:"
mysql -u $DB_USER -p $DB_NAME -e "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='$DB_NAME';"
