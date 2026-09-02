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

// GET ALL CATEGORIES
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

                COALESCE(
                    SUM(i.quantity),
                    0
                ) AS quantity,

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
            SELECT
                id,
                product_id,
                quantity,
                buying_price,
                selling_price,
                purchase_date
            FROM inventory
            WHERE product_id = ?
            ORDER BY purchase_date DESC, id DESC
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
// CREATE PRODUCT + INVENTORY
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


        if (!name || !name.trim()) {

            return res.status(400).json({
                success: false,
                message: "Product name is required"
            });
        }


        if (
            quantity === undefined ||
            quantity === null ||
            Number(quantity) <= 0
        ) {

            return res.status(400).json({
                success: false,
                message: "Quantity must be greater than 0"
            });
        }


        if (
            buying_price === undefined ||
            buying_price === null ||
            Number(buying_price) < 0
        ) {

            return res.status(400).json({
                success: false,
                message: "Valid buying price is required"
            });
        }


        if (
            selling_price === undefined ||
            selling_price === null ||
            Number(selling_price) < 0
        ) {

            return res.status(400).json({
                success: false,
                message: "Valid selling price is required"
            });
        }


        await connection.beginTransaction();


        // Check existing product
        const [existingProducts] = await connection.query(`
            SELECT id
            FROM products
            WHERE LOWER(name) = LOWER(?)
            LIMIT 1
        `, [name.trim()]);


        let productId;


        if (existingProducts.length > 0) {

            productId = existingProducts[0].id;

        } else {

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


        // Add inventory batch
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


        if (!quantity || Number(quantity) <= 0) {

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
            Number(quantity),
            Number(buying_price),
            Number(selling_price),
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
// DECREASE PRODUCT QUANTITY BY 1
// =====================================================

app.delete("/api/products/:id", async (req, res) => {

    const connection = await pool.getConnection();

    try {

        const { id } = req.params;

        await connection.beginTransaction();


        const [products] = await connection.query(`
            SELECT id, name
            FROM products
            WHERE id = ?
        `, [id]);


        if (products.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }


        // Get the oldest inventory batch
        const [inventoryRows] = await connection.query(`
            SELECT
                id,
                quantity
            FROM inventory
            WHERE product_id = ?
              AND quantity > 0
            ORDER BY purchase_date ASC, id ASC
            LIMIT 1
            FOR UPDATE
        `, [id]);


        if (inventoryRows.length === 0) {

            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "Product has no stock available"
            });
        }


        const inventory = inventoryRows[0];

        const currentQuantity =
            Number(inventory.quantity);


        if (currentQuantity <= 1) {

            await connection.query(
                "DELETE FROM inventory WHERE id = ?",
                [inventory.id]
            );

        } else {

            await connection.query(`
                UPDATE inventory
                SET quantity = quantity - 1
                WHERE id = ?
            `, [inventory.id]);
        }


        // Get remaining quantity
        const [remaining] = await connection.query(`
            SELECT COALESCE(SUM(quantity), 0) AS quantity
            FROM inventory
            WHERE product_id = ?
        `, [id]);


        const newQuantity =
            Number(remaining[0].quantity);


        await connection.commit();


        res.json({
            success: true,
            message: "Product quantity decreased by 1",
            productId: Number(id),
            productName: products[0].name,
            quantity: newQuantity
        });


    } catch (error) {

        await connection.rollback();

        console.error("Decrease quantity error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to decrease product quantity",
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
                    i.quantity *
                    i.buying_price
                ) AS buying_value,

                (
                    i.quantity *
                    i.selling_price
                ) AS selling_value,

                (
                    i.quantity *
                    (
                        i.selling_price -
                        i.buying_price
                    )
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
// SALES
// =====================================================


// GET ALL SALES
app.get("/api/sales", async (req, res) => {

    try {

        const [sales] = await pool.query(`
            SELECT
                s.id,
                s.total_amount,
                s.total_profit,
                s.sale_date,
                COUNT(si.id) AS item_count
            FROM sales s
            LEFT JOIN sale_items si
                ON s.id = si.sale_id
            GROUP BY
                s.id,
                s.total_amount,
                s.total_profit,
                s.sale_date
            ORDER BY
                s.sale_date DESC,
                s.id DESC
        `);


        res.json({
            success: true,
            data: sales
        });


    } catch (error) {

        console.error("Get sales error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch sales",
            error: error.message
        });
    }
});


// GET SINGLE SALE
app.get("/api/sales/:id", async (req, res) => {

    try {

        const { id } = req.params;


        const [sales] = await pool.query(`
            SELECT
                id,
                total_amount,
                total_profit,
                sale_date
            FROM sales
            WHERE id = ?
        `, [id]);


        if (sales.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Sale not found"
            });
        }


        const [items] = await pool.query(`
            SELECT
                si.id,
                si.sale_id,
                si.product_id,
                p.name AS product_name,
                si.quantity,
                si.buying_price,
                si.selling_price,
                si.profit
            FROM sale_items si
            INNER JOIN products p
                ON si.product_id = p.id
            WHERE si.sale_id = ?
            ORDER BY si.id ASC
        `, [id]);


        res.json({
            success: true,
            data: {
                sale: sales[0],
                items
            }
        });


    } catch (error) {

        console.error("Get sale error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch sale",
            error: error.message
        });
    }
});


// CREATE SALE
app.post("/api/sales", async (req, res) => {

    const connection = await pool.getConnection();

    try {

        const { items } = req.body;


        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!Array.isArray(items) || items.length === 0) {

            return res.status(400).json({
                success: false,
                message: "At least one product is required"
            });
        }


        const saleItems = items.map((item) => ({
            product_id: Number(item.product_id),
            quantity: Number(item.quantity),
            selling_price:
                item.selling_price !== undefined &&
                item.selling_price !== null
                    ? Number(item.selling_price)
                    : null
        }));


        for (const item of saleItems) {

            if (
                !Number.isInteger(item.product_id) ||
                item.product_id <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid product ID"
                });
            }


            if (
                !Number.isInteger(item.quantity) ||
                item.quantity <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Sale quantity must be greater than 0"
                });
            }


            if (
                item.selling_price !== null &&
                (
                    !Number.isFinite(item.selling_price) ||
                    item.selling_price < 0
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid selling price"
                });
            }
        }


        // -------------------------------------------------
        // COMBINE DUPLICATE PRODUCTS
        // -------------------------------------------------

        const combined = {};


        for (const item of saleItems) {

            if (!combined[item.product_id]) {

                combined[item.product_id] = {
                    product_id: item.product_id,
                    quantity: 0,
                    selling_price: item.selling_price
                };
            }


            combined[item.product_id].quantity +=
                item.quantity;


            if (item.selling_price !== null) {

                combined[item.product_id].selling_price =
                    item.selling_price;
            }
        }


        const finalItems =
            Object.values(combined);


        await connection.beginTransaction();


        // -------------------------------------------------
        // CREATE SALE
        // -------------------------------------------------

        const [saleResult] = await connection.query(`
            INSERT INTO sales
            (
                total_amount,
                total_profit
            )
            VALUES (0, 0)
        `);


        const saleId =
            saleResult.insertId;


        let totalAmount = 0;
        let totalProfit = 0;


        // -------------------------------------------------
        // PROCESS PRODUCTS
        // -------------------------------------------------

        for (const item of finalItems) {

            // Oldest inventory first
            const [inventoryRows] =
                await connection.query(`
                    SELECT
                        id,
                        product_id,
                        quantity,
                        buying_price,
                        selling_price,
                        purchase_date
                    FROM inventory
                    WHERE product_id = ?
                      AND quantity > 0
                    ORDER BY
                        purchase_date ASC,
                        id ASC
                    FOR UPDATE
                `, [item.product_id]);


            const availableQuantity =
                inventoryRows.reduce(
                    (total, row) =>
                        total + Number(row.quantity),
                    0
                );


            if (
                availableQuantity <
                item.quantity
            ) {

                throw new Error(
                    `Insufficient stock for product ID ${item.product_id}. ` +
                    `Available: ${availableQuantity}, ` +
                    `Requested: ${item.quantity}`
                );
            }


            let remainingQuantity =
                item.quantity;


            // -------------------------------------------------
            // CONSUME INVENTORY
            // -------------------------------------------------

            for (const lot of inventoryRows) {

                if (remainingQuantity <= 0) {
                    break;
                }


                const lotQuantity =
                    Number(lot.quantity);


                const quantitySold =
                    Math.min(
                        remainingQuantity,
                        lotQuantity
                    );


                const buyingPrice =
                    Number(lot.buying_price);


                const sellingPrice =
                    item.selling_price !== null
                        ? item.selling_price
                        : Number(lot.selling_price);


                const profitPerItem =
                    sellingPrice -
                    buyingPrice;


                const itemProfit =
                    quantitySold *
                    profitPerItem;


                const itemAmount =
                    quantitySold *
                    sellingPrice;


                // Record sale item
                await connection.query(`
                    INSERT INTO sale_items
                    (
                        sale_id,
                        product_id,
                        quantity,
                        buying_price,
                        selling_price,
                        profit
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    saleId,
                    item.product_id,
                    quantitySold,
                    buyingPrice,
                    sellingPrice,
                    itemProfit
                ]);


                // Reduce inventory
                const newQuantity =
                    lotQuantity -
                    quantitySold;


                if (newQuantity <= 0) {

                    await connection.query(
                        "DELETE FROM inventory WHERE id = ?",
                        [lot.id]
                    );

                } else {

                    await connection.query(`
                        UPDATE inventory
                        SET quantity = ?
                        WHERE id = ?
                    `, [
                        newQuantity,
                        lot.id
                    ]);
                }


                totalAmount +=
                    itemAmount;

                totalProfit +=
                    itemProfit;


                remainingQuantity -=
                    quantitySold;
            }
        }


        // -------------------------------------------------
        // UPDATE SALE TOTALS
        // -------------------------------------------------

        await connection.query(`
            UPDATE sales
            SET
                total_amount = ?,
                total_profit = ?
            WHERE id = ?
        `, [
            totalAmount,
            totalProfit,
            saleId
        ]);


        await connection.commit();


        res.status(201).json({
            success: true,
            message: "Sale completed successfully",
            saleId,
            total_amount: totalAmount,
            total_profit: totalProfit
        });


    } catch (error) {

        await connection.rollback();

        console.error("Create sale error:", error);

        res.status(400).json({
            success: false,
            message:
                error.message ||
                "Failed to complete sale"
        });

    } finally {

        connection.release();
    }
});


// =====================================================
// DASHBOARD SUMMARY
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
// ADVANCED REPORTS
// =====================================================

app.get("/api/reports", async (req, res) => {

    try {

        const { start_date, end_date } = req.query;

        let where = "";
        const params = [];

        if (start_date && end_date) {

            where = `
                WHERE s.sale_date >= ?
                AND s.sale_date < DATE_ADD(?, INTERVAL 1 DAY)
            `;

            params.push(start_date);
            params.push(end_date);

        } else if (start_date) {

            where = `
                WHERE s.sale_date >= ?
            `;

            params.push(start_date);

        } else if (end_date) {

            where = `
                WHERE s.sale_date < DATE_ADD(?, INTERVAL 1 DAY)
            `;

            params.push(end_date);
        }


        // =================================================
        // SUMMARY
        // =================================================

        const [summaryRows] = await pool.query(`

            SELECT

                COUNT(DISTINCT s.id) AS total_transactions,

                COALESCE(
                    SUM(si.quantity),
                    0
                ) AS total_items_sold,

                COALESCE(
                    SUM(si.quantity * si.selling_price),
                    0
                ) AS total_sales,

                COALESCE(
                    SUM(si.profit),
                    0
                ) AS total_profit

            FROM sales s

            LEFT JOIN sale_items si
                ON si.sale_id = s.id

            ${where}

        `, params);


        // =================================================
        // BEST SELLING PRODUCTS
        // =================================================

        const [products] = await pool.query(`

            SELECT

                p.id,

                p.name,

                COALESCE(
                    SUM(si.quantity),
                    0
                ) AS quantity_sold,

                COALESCE(
                    SUM(
                        si.quantity * si.selling_price
                    ),
                    0
                ) AS sales_amount,

                COALESCE(
                    SUM(si.profit),
                    0
                ) AS profit

            FROM sales s

            INNER JOIN sale_items si
                ON si.sale_id = s.id

            INNER JOIN products p
                ON p.id = si.product_id

            ${where}

            GROUP BY
                p.id,
                p.name

            ORDER BY
                quantity_sold DESC

        `, params);


        // =================================================
        // SALES HISTORY
        // =================================================

        const [sales] = await pool.query(`

            SELECT

                s.id,

                s.total_amount,

                s.total_profit,

                s.sale_date,

                COALESCE(
                    SUM(si.quantity),
                    0
                ) AS items_sold

            FROM sales s

            LEFT JOIN sale_items si
                ON si.sale_id = s.id

            ${where}

            GROUP BY
                s.id,
                s.total_amount,
                s.total_profit,
                s.sale_date

            ORDER BY
                s.sale_date DESC

        `, params);


        // =================================================
        // RESPONSE
        // =================================================

        res.json({

            success: true,

            data: {

                summary:
                    summaryRows[0] || {
                        total_transactions: 0,
                        total_items_sold: 0,
                        total_sales: 0,
                        total_profit: 0
                    },

                best_selling_products: products,

                sales_history: sales

            }

        });

    } catch (error) {

        console.error(
            "Reports error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Failed to generate reports",

            error: error.message

        });

    }

});


// =====================================================
// 404
// =====================================================

app.use((req, res) => {

    res.status(404).json({
        success: false,
        message:
            `Route ${req.method} ${req.originalUrl} not found`
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

const PORT =
    process.env.PORT || 3000;


app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `EM-PLUGS Business Inventory API running on port ${PORT}`
    );
});
