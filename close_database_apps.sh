#!/bin/bash

echo "🔍 Checking for processes using sistem_pos.db..."
echo ""

# Check if database is locked
if ! lsof sistem_pos.db > /dev/null 2>&1; then
    echo "✅ No processes are using the database!"
    echo "You can now run: ./fix_database.sh"
    exit 0
fi

echo "⚠️  The following processes are using the database:"
echo ""
lsof sistem_pos.db | tail -n +2 | while read line; do
    CMD=$(echo $line | awk '{print $1}')
    PID=$(echo $line | awk '{print $2}')
    echo "  - $CMD (PID: $PID)"
done

echo ""
echo "Options:"
echo "  1. Close these apps manually (recommended)"
echo "  2. Force kill them (may lose unsaved data)"
echo "  3. Cancel"
echo ""
read -p "Enter your choice (1/2/3): " choice

case $choice in
    1)
        echo ""
        echo "Please close the apps manually, then run this script again."
        ;;
    2)
        echo ""
        echo "Force killing processes..."
        lsof sistem_pos.db | tail -n +2 | awk '{print $2}' | while read pid; do
            echo "  Killing PID $pid..."
            kill -9 $pid 2>/dev/null
        done
        sleep 1
        if lsof sistem_pos.db > /dev/null 2>&1; then
            echo "❌ Some processes are still running"
        else
            echo "✅ All processes closed"
            echo ""
            echo "You can now run: ./fix_database.sh"
        fi
        ;;
    3)
        echo "Cancelled."
        exit 0
        ;;
    *)
        echo "Invalid choice."
        exit 1
        ;;
esac
