const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/database");

const app = express();


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "EM-PLUGS Business Inventory API is running"
    });
});


// =====================================================
// TEST DATABASE
// =====================================================

app.get("/api/test-db", async (req, res) => {
    try {

        const [rows] = await pool.query(
            "SELECT 1 AS connected"
        );

        res.json({
            success: true,
            message: "Database connected successfully",
            data: rows
        });

    } catch (error) {

        console.error("Database error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed",
            error: error.message
        });
    }
});


// =====================================================
// CATEGORIES
// =====================================================

// GET CATEGORIES
app.get("/api/categories", async (req, res) => {

    try {

        const [categories] = await pool.query(`
            SELECT *
            FROM categories
            ORDER BY name ASC
        `);

        res.json({
            success: true,
            data: categories
        });

    } catch (error) {

        console.error("Get categories error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch categories",
            error: error.message
        });
    }
});


// CREATE CATEGORY
app.post("/api/categories", async (req, res) => {

    try {

        const { name } = req.body;

        if (!name || !name.trim()) {

            return res.status(400).json({
                success: false,
                message: "Category name is required"
            });
        }

        const [result] = await pool.query(
            "INSERT INTO categories (name) VALUES (?)",
            [name.trim()]
        );

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            categoryId: result.insertId
        });

    } catch (error) {

        console.error("Create category error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create category",
            error: error.message
        });
    }
});


// =====================================================
// PRODUCTS
// =====================================================

// GET ALL PRODUCTS
app.get("/api/products", async (req, res) => {

    try {

        const [products] = await pool.query(`
            SELECT
                p.id,
                p.name,
                p.category_id,
                c.name AS category,
                p.description,
                p.created_at,

                COALESCE(SUM(i.quantity), 0) AS quantity,

                COALESCE(
                    SUM(i.quantity * i.buying_price),
                    0
                ) AS total_buying_value,

                COALESCE(
                    SUM(i.quantity * i.selling_price),
                    0
                ) AS total_selling_value,

                COALESCE(
                    SUM(
                        i.quantity *
                        (i.selling_price - i.buying_price)
                    ),
                    0
                ) AS expected_profit

            FROM products p

            LEFT JOIN categories c
                ON p.category_id = c.id

            LEFT JOIN inventory i
                ON p.id = i.product_id

            GROUP BY
                p.id,
                p.name,
                p.category_id,
                c.name,
                p.description,
                p.created_at

            ORDER BY p.id DESC
        `);

        res.json({
            success: true,
            data: products
        });

    } catch (error) {

        console.error("Get products error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch products",
            error: error.message
        });
    }
});


// GET SINGLE PRODUCT
app.get("/api/products/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const [products] = await pool.query(`
            SELECT
                p.id,
                p.name,
                p.category_id,
                c.name AS category,
                p.description,
                p.created_at

            FROM products p

            LEFT JOIN categories c
                ON p.category_id = c.id

            WHERE p.id = ?
        `, [id]);

        if (products.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const [inventory] = await pool.query(`
            SELECT *
            FROM inventory
            WHERE product_id = ?
            ORDER BY purchase_date DESC
        `, [id]);

        res.json({
            success: true,
            data: {
                product: products[0],
                inventory
            }
        });

    } catch (error) {

        console.error("Get product error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch product",
            error: error.message
        });
    }
});


// =====================================================
// CREATE PRODUCT
// =====================================================

app.post("/api/products", async (req, res) => {

    const connection = await pool.getConnection();

    try {

        const {
            name,
            category_id,
            description,
            quantity,
            buying_price,
            selling_price,
            purchase_date
        } = req.body;


        // VALIDATION

        if (!name || !name.trim()) {

            return res.status(400).json({
                success: false,
                message: "Product name is required"
            });
        }

        if (
            quantity === undefined ||
            quantity === null ||
            quantity === ""
        ) {

            return res.status(400).json({
                success: false,
                message: "Quantity is required"
            });
        }

        if (
            buying_price === undefined ||
            buying_price === null ||
            buying_price === ""
        ) {

            return res.status(400).json({
                success: false,
                message: "Buying price is required"
            });
        }

        if (
            selling_price === undefined ||
            selling_price === null ||
            selling_price === ""
        ) {

            return res.status(400).json({
                success: false,
                message: "Selling price is required"
            });
        }


        await connection.beginTransaction();


        // CHECK EXISTING PRODUCT

        const [existingProducts] = await connection.query(`
            SELECT id
            FROM products
            WHERE LOWER(name) = LOWER(?)
            LIMIT 1
        `, [name.trim()]);


        let productId;


        // EXISTING PRODUCT

        if (existingProducts.length > 0) {

            productId = existingProducts[0].id;

        } else {

            // NEW PRODUCT

            const [productResult] = await connection.query(`
                INSERT INTO products
                (
                    name,
                    category_id,
                    description
                )
                VALUES (?, ?, ?)
            `, [
                name.trim(),
                category_id || null,
                description || null
            ]);

            productId = productResult.insertId;
        }


        // ADD INVENTORY

        await connection.query(`
            INSERT INTO inventory
            (
                product_id,
                quantity,
                buying_price,
                selling_price,
                purchase_date
            )
            VALUES (?, ?, ?, ?, ?)
        `, [
            productId,
            Number(quantity),
            Number(buying_price),
            Number(selling_price),
            purchase_date ||
            new Date().toISOString().split("T")[0]
        ]);


        await connection.commit();


        res.status(201).json({
            success: true,

            message:
                existingProducts.length > 0
                    ? "Existing product inventory updated successfully"
                    : "Product added successfully",

            productId
        });

    } catch (error) {

        await connection.rollback();

        console.error("Create product error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create product",
            error: error.message
        });

    } finally {

        connection.release();
    }
});


// =====================================================
// ADD MORE STOCK
// =====================================================

app.post("/api/products/:id/stock", async (req, res) => {

    try {

        const { id } = req.params;

        const {
            quantity,
            buying_price,
            selling_price,
            purchase_date
        } = req.body;


        if (!quantity || quantity <= 0) {

            return res.status(400).json({
                success: false,
                message: "Quantity must be greater than 0"
            });
        }


        const [products] = await pool.query(
            "SELECT id FROM products WHERE id = ?",
            [id]
        );


        if (products.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }


        await pool.query(`
            INSERT INTO inventory
            (
                product_id,
                quantity,
                buying_price,
                selling_price,
                purchase_date
            )
            VALUES (?, ?, ?, ?, ?)
        `, [
            id,
            quantity,
            buying_price,
            selling_price,
            purchase_date ||
            new Date().toISOString().split("T")[0]
        ]);


        res.status(201).json({
            success: true,
            message: "Stock added successfully"
        });

    } catch (error) {

        console.error("Add stock error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to add stock",
            error: error.message
        });
    }
});


// =====================================================
// DELETE PRODUCT
// =====================================================

app.delete("/api/products/:id", async (req, res) => {

    const connection = await pool.getConnection();

    try {

        const { id } = req.params;

        await connection.beginTransaction();


        // CHECK PRODUCT

        const [products] = await connection.query(
            "SELECT id FROM products WHERE id = ?",
            [id]
        );


        if (products.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }


        // DELETE INVENTORY

        await connection.query(
            "DELETE FROM inventory WHERE product_id = ?",
            [id]
        );


        // DELETE SALE ITEMS

        await connection.query(
            "DELETE FROM sale_items WHERE product_id = ?",
            [id]
        );


        // DELETE PRODUCT

        await connection.query(
            "DELETE FROM products WHERE id = ?",
            [id]
        );


        await connection.commit();


        res.json({
            success: true,
            message: "Product deleted successfully",
            productId: Number(id)
        });

    } catch (error) {

        await connection.rollback();

        console.error("DELETE PRODUCT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete product",
            error: error.message
        });

    } finally {

        connection.release();
    }
});


// =====================================================
// INVENTORY
// =====================================================

app.get("/api/inventory", async (req, res) => {

    try {

        const [inventory] = await pool.query(`
            SELECT
                i.id,
                i.product_id,
                p.name AS product_name,
                i.quantity,
                i.buying_price,
                i.selling_price,
                i.purchase_date,

                (
                    i.quantity * i.buying_price
                ) AS buying_value,

                (
                    i.quantity * i.selling_price
                ) AS selling_value,

                (
                    i.quantity *
                    (i.selling_price - i.buying_price)
                ) AS expected_profit

            FROM inventory i

            INNER JOIN products p
                ON i.product_id = p.id

            ORDER BY
                i.purchase_date DESC,
                i.id DESC
        `);


        res.json({
            success: true,
            data: inventory
        });

    } catch (error) {

        console.error("Get inventory error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch inventory",
            error: error.message
        });
    }
});


// =====================================================
// DASHBOARD
// =====================================================

app.get("/api/dashboard", async (req, res) => {

    try {

        const [summary] = await pool.query(`
            SELECT

                COUNT(DISTINCT p.id)
                    AS total_products,

                COALESCE(
                    SUM(i.quantity),
                    0
                ) AS total_items,

                COALESCE(
                    SUM(
                        i.quantity *
                        i.buying_price
                    ),
                    0
                ) AS total_buying_value,

                COALESCE(
                    SUM(
                        i.quantity *
                        i.selling_price
                    ),
                    0
                ) AS total_selling_value,

                COALESCE(
                    SUM(
                        i.quantity *
                        (
                            i.selling_price -
                            i.buying_price
                        )
                    ),
                    0
                ) AS expected_profit

            FROM products p

            LEFT JOIN inventory i
                ON p.id = i.product_id
        `);


        const [sales] = await pool.query(`
            SELECT

                COALESCE(
                    SUM(total_amount),
                    0
                ) AS total_sales,

                COALESCE(
                    SUM(total_profit),
                    0
                ) AS total_profit

            FROM sales
        `);


        res.json({
            success: true,

            data: {
                inventory: summary[0],
                sales: sales[0]
            }
        });

    } catch (error) {

        console.error("Dashboard error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load dashboard",
            error: error.message
        });
    }
});


// =====================================================
// 404 ROUTE
// IMPORTANT: THIS MUST BE LAST
// =====================================================

app.use((req, res) => {

    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`
    });

});


// =====================================================
// ERROR HANDLER
// =====================================================

app.use((error, req, res, next) => {

    console.error("Server error:", error);

    res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
    });

});


// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        `EM-PLUGS Business Inventory API running on port ${PORT}`
    );

});