const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Connect to SQLite DB; create file if not exists
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('DB Connection Error:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
});

// Create tables
db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone_number TEXT NOT NULL UNIQUE
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      address_details TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pin_code TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);
});

// Utility: Validate customer input
function validateCustomer(data) {
    const { first_name, last_name, phone_number } = data;
    if (!first_name || !last_name || !phone_number) return false;
    return true;
}

// Utility: Validate address input
function validateAddress(data) {
    const { address_details, city, state, pin_code } = data;
    if (!address_details || !city || !state || !pin_code) return false;
    return true;
}

// ==== API Routes ====

// Create customer with optional addresses
app.post('/api/customers', (req, res) => {
    const { first_name, last_name, phone_number, addresses } = req.body;
    if (!validateCustomer(req.body)) {
        return res.status(400).json({ error: "Invalid customer data" });
    }
    // Insert customer
    const insertCustomerSql = 'INSERT INTO customers(first_name, last_name, phone_number) VALUES (?, ?, ?)';
    db.run(insertCustomerSql, [first_name, last_name, phone_number], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        const customerId = this.lastID;
        if (Array.isArray(addresses) && addresses.length > 0) {
            // Insert addresses linked to customer
            const insertAddrSql = 'INSERT INTO addresses(customer_id, address_details, city, state, pin_code) VALUES (?, ?, ?, ?, ?)';
            const stmt = db.prepare(insertAddrSql);
            for (const addr of addresses) {
                if (validateAddress(addr)) {
                    stmt.run(customerId, addr.address_details, addr.city, addr.state, addr.pin_code);
                }
            }
            stmt.finalize(() => {
                res.json({ message: "Customer and addresses created", customerId });
            });
        } else {
            res.json({ message: "Customer created", customerId });
        }
    });
});

// Get customers list with search, sorting, pagination
app.get('/api/customers', (req, res) => {
    const {
        page = 1,
        limit = 10,
        city,
        state,
        pin_code,
        sortField = 'id',
        sortOrder = 'ASC',
        search,
    } = req.query;

    const offset = (page - 1) * limit;

    let conditions = [];
    let params = [];

    if (city) {
        conditions.push('id IN (SELECT customer_id FROM addresses WHERE city = ?)');
        params.push(city);
    }
    if (state) {
        conditions.push('id IN (SELECT customer_id FROM addresses WHERE state = ?)');
        params.push(state);
    }
    if (pin_code) {
        conditions.push('id IN (SELECT customer_id FROM addresses WHERE pin_code = ?)');
        params.push(pin_code);
    }
    if (search) {
        conditions.push('(first_name LIKE ? OR last_name LIKE ? OR phone_number LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    let whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    // Get total count for pagination
    const countSql = `SELECT COUNT(*) AS count FROM customers ${whereClause}`;
    db.get(countSql, params, (err, countRow) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        const totalCount = countRow.count;

        // Get paged results with sorting
        const validSortFields = ['id', 'first_name', 'last_name', 'phone_number'];
        const sortF = validSortFields.includes(sortField) ? sortField : 'id';
        const sortO = String(sortOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const sql = `
      SELECT * FROM customers
      ${whereClause}
      ORDER BY ${sortF} ${sortO}
      LIMIT ? OFFSET ?
    `;
        db.all(sql, [...params, Number(limit), Number(offset)], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                message: 'success',
                data: rows,
                pagination: {
                    total: totalCount,
                    page: Number(page),
                    pages: Math.ceil(totalCount / limit),
                    limit: Number(limit),
                },
            });
        });
    });
});

// Get single customer with addresses
app.get('/api/customers/:id', (req, res) => {
    const customerId = req.params.id;
    const customerSql = 'SELECT * FROM customers WHERE id = ?';
    const addressesSql = 'SELECT * FROM addresses WHERE customer_id = ?';

    db.get(customerSql, [customerId], (err, customer) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!customer) return res.status(404).json({ error: "Customer not found" });

        db.all(addressesSql, [customerId], (err, addresses) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "success", data: { customer, addresses } });
        });
    });
});

// Update customer details
app.put('/api/customers/:id', (req, res) => {
    const customerId = req.params.id;
    const { first_name, last_name, phone_number } = req.body;
    if (!validateCustomer(req.body)) {
        return res.status(400).json({ error: "Invalid customer data" });
    }
    const sql = 'UPDATE customers SET first_name = ?, last_name = ?, phone_number = ? WHERE id = ?';
    db.run(sql, [first_name, last_name, phone_number, customerId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Customer not found" });
        res.json({ message: "Customer updated" });
    });
});

// Delete customer (with cascade addresses)
app.delete('/api/customers/:id', (req, res) => {
    const customerId = req.params.id;
    // Ideally check for linked transactions before deletion (not implemented here)
    db.run('DELETE FROM customers WHERE id = ?', [customerId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Customer not found" });
        res.json({ message: "Customer deleted" });
    });
});

// Add address for customer
app.post('/api/customers/:id/addresses', (req, res) => {
    const customerId = req.params.id;
    if (!validateAddress(req.body)) return res.status(400).json({ error: "Invalid address data" });

    const { address_details, city, state, pin_code } = req.body;
    const sql = 'INSERT INTO addresses(customer_id, address_details, city, state, pin_code) VALUES (?, ?, ?, ?, ?)';
    db.run(sql, [customerId, address_details, city, state, pin_code], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Address added", addressId: this.lastID });
    });
});

// Get addresses for a customer
app.get('/api/customers/:id/addresses', (req, res) => {
    const customerId = req.params.id;
    const sql = 'SELECT * FROM addresses WHERE customer_id = ?';
    db.all(sql, [customerId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "success", data: rows });
    });
});

// Update an address
app.put('/api/addresses/:addressId', (req, res) => {
    const addressId = req.params.addressId;
    if (!validateAddress(req.body)) return res.status(400).json({ error: "Invalid address data" });

    const { address_details, city, state, pin_code } = req.body;
    const sql = 'UPDATE addresses SET address_details = ?, city = ?, state = ?, pin_code = ? WHERE id = ?';
    db.run(sql, [address_details, city, state, pin_code, addressId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Address not found" });
        res.json({ message: "Address updated" });
    });
});

// Delete an address
app.delete('/api/addresses/:addressId', (req, res) => {
    const addressId = req.params.addressId;
    db.run('DELETE FROM addresses WHERE id = ?', [addressId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Address not found" });
        res.json({ message: "Address deleted" });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
