const path = require('path')
const config = require('../config')
const sqlite = require("sqlite3").verbose()
const db = new sqlite.Database(
  path.join(__dirname, '../', config.dbFile)
)

const createTables = async () => {

  // Define separate SQL statements for each table creation
  const queries = [
    `
    CREATE TABLE IF NOT EXISTS "ads" (
        "id"            INTEGER NOT NULL UNIQUE,
        "searchTerm"    TEXT NOT NULL,
        "title"	        TEXT NOT NULL,
        "price"         INTEGER NOT NULL,
        "url"           TEXT NOT NULL,
        "created"       TEXT NOT NULL,
        "lastUpdate"    TEXT NOT NULL,
        "userId"        INTEGER
    );`,

    `CREATE TABLE IF NOT EXISTS "logs" (
        "id"            INTEGER NOT NULL UNIQUE,
        "url"           TEXT NOT NULL,  
        "adsFound"      INTEGER NOT NULL, 
        "averagePrice"  NUMERIC NOT NULL,
        "minPrice"      NUMERIC NOT NULL,
        "maxPrice"      NUMERIC NOT NULL, 
        "created"       TEXT NOT NULL,
        PRIMARY KEY("id" AUTOINCREMENT)
    );`,

    `CREATE TABLE IF NOT EXISTS "users" (
        "id"            INTEGER PRIMARY KEY,
        "username"      TEXT,
        "firstName"     TEXT,
        "lastName"      TEXT,
        "created"       TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS "user_urls" (
        "id"            INTEGER PRIMARY KEY AUTOINCREMENT,
        "userId"        INTEGER NOT NULL,
        "url"           TEXT NOT NULL,
        "label"         TEXT,
        "isActive"      INTEGER DEFAULT 1,
        "created"       TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
    );`,
  ];

  // Add userId column to ads table if it doesn't exist (for existing databases)
  const alterQueries = [`ALTER TABLE ads ADD COLUMN userId INTEGER;`];

  return new Promise(function (resolve, reject) {
    // Iterate through the array of queries and execute them one by one
    const executeQuery = (index) => {
      if (index === queries.length) {
        // After creating tables, try to add userId column to ads (will fail silently if already exists)
        const executeAlter = (alterIndex) => {
          if (alterIndex === alterQueries.length) {
            resolve(true);
            return;
          }
          db.run(alterQueries[alterIndex], function (error) {
            // Ignore error if column already exists
            executeAlter(alterIndex + 1);
          });
        };
        executeAlter(0);
        return;
      }

      db.run(queries[index], function (error) {
        if (error) {
          reject(error);
          return;
        }

        // Execute the next query in the array
        executeQuery(index + 1);
      });
    };

    // Start executing the queries from index 0
    executeQuery(0);
  });
}

module.exports = {
  db,
  createTables
}
