const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Connect to SQLite DB (creates file if not exists)
const db = new Database("./database.db", { verbose: console.log });
db.pragma("foreign_keys = ON");
console.log("Connected to SQLite database.");

// Create tables
db.prepare(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT NOT NULL UNIQUE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    address_details TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pin_code TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  )
`).run();

// Utility: Validate customer input
function validateCustomer(data) {
    const { first_name, last_name, phone_number } = data;
    return !!(first_name && last_name && phone_number);
}

// Utility: Validate address input
function validateAddress(data) {
    const { address_details, city, state, pin_code } = data;
    return !!(address_details && city && state && pin_code);
}

// ==== API Routes ====

// Create customer with optional addresses
app.post("/api/customers", (req, res) => {
    const { first_name, last_name, phone_number, addresses } = req.body;
    if (!validateCustomer(req.body)) {
        return res.status(400).json({ error: "Invalid customer data" });
    }

    try {
        const insertCustomer = db.prepare(
            "INSERT INTO customers(first_name, last_name, phone_number) VALUES (?, ?, ?)"
        );
        const result = insertCustomer.run(first_name, last_name, phone_number);
        const customerId = result.lastInsertRowid;

        if (Array.isArray(addresses) && addresses.length > 0) {
            const insertAddr = db.prepare(
                "INSERT INTO addresses(customer_id, address_details, city, state, pin_code) VALUES (?, ?, ?, ?, ?)"
            );
            const insertMany = db.transaction((addresses) => {
                for (const addr of addresses) {
                    if (validateAddress(addr)) {
                        insertAddr.run(
                            customerId,
                            addr.address_details,
                            addr.city,
                            addr.state,
                            addr.pin_code
                        );
                    }
                }
            });
            insertMany(addresses);
            return res.json({ message: "Customer and addresses created", customerId });
        }

        res.json({ message: "Customer created", customerId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get customers list with search, sorting, pagination
app.get("/api/customers", (req, res) => {
    let {
        page = 1,
        limit = 10,
        city,
        state,
        pin_code,
        sortField = "id",
        sortOrder = "ASC",
        search,
    } = req.query;

    page = Number(page);
    limit = Number(limit);
    const offset = (page - 1) * limit;

    let conditions = [];
    let params = [];

    if (city) {
        conditions.push("id IN (SELECT customer_id FROM addresses WHERE city = ?)");
        params.push(city);
    }
    if (state) {
        conditions.push("id IN (SELECT customer_id FROM addresses WHERE state = ?)");
        params.push(state);
    }
    if (pin_code) {
        conditions.push("id IN (SELECT customer_id FROM addresses WHERE pin_code = ?)");
        params.push(pin_code);
    }
    if (search) {
        conditions.push(
            "(first_name LIKE ? OR last_name LIKE ? OR phone_number LIKE ?)"
        );
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    try {
        const countStmt = db.prepare(`SELECT COUNT(*) AS count FROM customers ${whereClause}`);
        const totalCount = countStmt.get(...params).count;

        const validSortFields = ["id", "first_name", "last_name", "phone_number"];
        const sortF = validSortFields.includes(sortField) ? sortField : "id";
        const sortO = String(sortOrder).toUpperCase() === "DESC" ? "DESC" : "ASC";

        const sql = `
      SELECT * FROM customers
      ${whereClause}
      ORDER BY ${sortF} ${sortO}
      LIMIT ? OFFSET ?
    `;
        const rows = db.prepare(sql).all(...params, limit, offset);

        res.json({
            message: "success",
            data: rows,
            pagination: {
                total: totalCount,
                page,
                pages: Math.ceil(totalCount / limit),
                limit,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single customer with addresses
app.get("/api/customers/:id", (req, res) => {
    const customerId = req.params.id;

    try {
        const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(customerId);
        if (!customer) return res.status(404).json({ error: "Customer not found" });

        const addresses = db
            .prepare("SELECT * FROM addresses WHERE customer_id = ?")
            .all(customerId);

        res.json({ message: "success", data: { customer, addresses } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update customer details
app.put("/api/customers/:id", (req, res) => {
    const customerId = req.params.id;
    const { first_name, last_name, phone_number } = req.body;

    if (!validateCustomer(req.body)) {
        return res.status(400).json({ error: "Invalid customer data" });
    }

    try {
        const stmt = db.prepare(
            "UPDATE customers SET first_name = ?, last_name = ?, phone_number = ? WHERE id = ?"
        );
        const result = stmt.run(first_name, last_name, phone_number, customerId);

        if (result.changes === 0) return res.status(404).json({ error: "Customer not found" });

        res.json({ message: "Customer updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete customer
app.delete("/api/customers/:id", (req, res) => {
    const customerId = req.params.id;

    try {
        const result = db.prepare("DELETE FROM customers WHERE id = ?").run(customerId);
        if (result.changes === 0) return res.status(404).json({ error: "Customer not found" });
        res.json({ message: "Customer deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add address
app.post("/api/customers/:id/addresses", (req, res) => {
    const customerId = req.params.id;
    if (!validateAddress(req.body))
        return res.status(400).json({ error: "Invalid address data" });

    const { address_details, city, state, pin_code } = req.body;

    try {
        const stmt = db.prepare(
            "INSERT INTO addresses(customer_id, address_details, city, state, pin_code) VALUES (?, ?, ?, ?, ?)"
        );
        const result = stmt.run(customerId, address_details, city, state, pin_code);

        res.json({ message: "Address added", addressId: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get addresses for a customer
app.get("/api/customers/:id/addresses", (req, res) => {
    const customerId = req.params.id;

    try {
        const rows = db.prepare("SELECT * FROM addresses WHERE customer_id = ?").all(customerId);
        res.json({ message: "success", data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update an address
app.put("/api/addresses/:addressId", (req, res) => {
    const addressId = req.params.addressId;
    if (!validateAddress(req.body))
        return res.status(400).json({ error: "Invalid address data" });

    const { address_details, city, state, pin_code } = req.body;

    try {
        const stmt = db.prepare(
            "UPDATE addresses SET address_details = ?, city = ?, state = ?, pin_code = ? WHERE id = ?"
        );
        const result = stmt.run(address_details, city, state, pin_code, addressId);

        if (result.changes === 0) return res.status(404).json({ error: "Address not found" });

        res.json({ message: "Address updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete an address
app.delete("/api/addresses/:addressId", (req, res) => {
    const addressId = req.params.addressId;

    try {
        const result = db.prepare("DELETE FROM addresses WHERE id = ?").run(addressId);
        if (result.changes === 0) return res.status(404).json({ error: "Address not found" });
        res.json({ message: "Address deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
