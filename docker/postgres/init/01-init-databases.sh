#!/bin/bash
set -e

# Optional: Create additional databases for different environments
# Only uncomment if you plan to use separate databases for dev/test
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- CREATE DATABASE medicalchallenge_dev;
    -- CREATE DATABASE medicalchallenge_test;
    
    -- The main database 'medicalchallenge' is already created by Docker
    -- Drizzle ORM will handle all schema creation via migrations
EOSQL

echo "Database ready for Drizzle ORM!"
