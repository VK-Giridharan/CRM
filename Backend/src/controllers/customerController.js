const pool = require("../database/connection");
const { getAuthContext } = require("../utils/authContext");
const { ROLES } = require("../utils/status");

// ======================================================
// customers.company_id is the tenant key and is always taken from the
// authenticated user's row - never from the request body.
//
// customers.status is a BOOLEAN column in the database, so anything the
// client sends is coerced rather than passed through as a string.
// ======================================================

const toBoolean = (value) => {

    if (typeof value === "boolean") return value;
    if (value === "true" || value === 1 || value === "1") return true;
    if (value === "false" || value === 0 || value === "0") return false;

    return null;

};

const sameCompany = (a, b) => Number(a) === Number(b);

// ================= CREATE =================

exports.createCustomer = async (req, res) => {

    try {

        const {
            customer_name,
            company_name,
            email,
            phone,
            alternate_phone,
            gst_number,
            website,
            address,
            city,
            state,
            country,
            pincode
        } = req.body;

        if (!customer_name || !String(customer_name).trim() || !phone) {
            return res.status(400).json({
                success: false,
                message: "Customer Name and Phone are required"
            });
        }

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        if (authUser.role !== ROLES.MANAGER) {
            return res.status(403).json({
                success: false,
                message: "Only Manager can create customers"
            });
        }

        if (!authUser.company_id) {
            return res.status(403).json({
                success: false,
                message: "You are not assigned to a company"
            });
        }

        const result = await pool.query(
            `INSERT INTO customers
            (
                company_id, manager_id, customer_name, company_name,
                email, phone, alternate_phone, gst_number, website,
                address, city, state, country, pincode
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            RETURNING id`,
            [
                authUser.company_id,
                authUser.id,
                String(customer_name).trim(),
                company_name || null,
                email || null,
                phone,
                alternate_phone || null,
                gst_number || null,
                website || null,
                address || null,
                city || null,
                state || null,
                country || null,
                pincode || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Customer Created Successfully",
            customer_id: result.rows[0].id
        });

    } catch (error) {

        console.log("CREATE CUSTOMER ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ================= LIST =================
// Previously returned every customer of every company with no filter.

exports.customerList = async (req, res) => {

    try {

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        const isAdmin = authUser.role === ROLES.ADMIN;

        if (!isAdmin && !authUser.company_id) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: []
            });
        }

        const result = await pool.query(
            `SELECT
                c.id,
                c.customer_name,
                c.company_name,
                c.email,
                c.phone,
                c.alternate_phone,
                c.gst_number,
                c.website,
                c.address,
                c.city,
                c.state,
                c.country,
                c.pincode,
                c.status,
                c.created_at,

                co.id           AS company_id,
                co.company_name AS crm_company,

                u.id AS manager_id,
                CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS manager_name

             FROM customers c
             LEFT JOIN companies co
                ON co.id = c.company_id
             LEFT JOIN users u
                ON u.id = c.manager_id
             WHERE c.deleted_at IS NULL
             ${isAdmin ? "" : "AND c.company_id = $1"}
             ORDER BY c.id DESC`,
            isAdmin ? [] : [authUser.company_id]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.log("CUSTOMER LIST ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ================= ADMIN LIST =================
//
// Global, cross-company customer list for the Admin Customers page.
//
// Kept separate from customerList on purpose: /customer/list is shared by the
// Manager page and must stay company-filtered, while this endpoint must NOT
// be filtered by the caller's company_id. Admin is a global administrator and
// has no meaningful "own company" here.
//
// The route is wrapped in requireRole(ROLES.ADMIN), so reaching this handler
// already proves the caller is an Admin. Role and company are read from the
// authenticated user's row - nothing is taken from the request body.
//
// Column note: customers.company_name is the customer's OWN business name and
// is a different thing from companies.company_name, which is the owning CRM
// tenant. They are returned under distinct keys so the UI cannot confuse them:
//     company_name          -> owning CRM company (companies JOIN)
//     customer_company_name -> customers.company_name

exports.adminCustomerList = async (req, res) => {

    try {

        const result = await pool.query(
            `SELECT
                c.id,
                c.customer_name,
                c.company_name AS customer_company_name,
                c.email,
                c.phone,
                c.alternate_phone,
                c.gst_number,
                c.website,
                c.address,
                c.city,
                c.state,
                c.country,
                c.pincode,
                c.status,
                c.created_at,
                c.updated_at,

                co.id            AS company_id,
                co.company_name  AS company_name,
                co.company_code  AS company_code,
                co.status        AS company_status,

                u.id AS manager_id,
                CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS manager_name

             FROM customers c
             LEFT JOIN companies co
                ON co.id = c.company_id
             LEFT JOIN users u
                ON u.id = c.manager_id
             WHERE c.deleted_at IS NULL
             ORDER BY co.company_name ASC NULLS LAST,
                      c.customer_name ASC`
        );

        // Distinct companies actually present in the result, so the Admin UI
        // can build its company filter without a second request.
        const companyMap = new Map();

        for (const row of result.rows) {

            if (row.company_id && !companyMap.has(row.company_id)) {
                companyMap.set(row.company_id, {
                    company_id: row.company_id,
                    company_name: row.company_name
                });
            }

        }

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows,
            companies: Array.from(companyMap.values())
        });

    } catch (error) {

        console.log("ADMIN CUSTOMER LIST ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ================= DETAILS =================

exports.customerDetails = async (req, res) => {

    try {

        const { customer_id } = req.body;

        if (!customer_id) {
            return res.status(400).json({
                success: false,
                message: "Customer Id is required"
            });
        }

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        const result = await pool.query(
            `SELECT *
             FROM customers
             WHERE id = $1
               AND deleted_at IS NULL`,
            [customer_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer Not Found"
            });
        }

        if (authUser.role !== ROLES.ADMIN &&
            !sameCompany(result.rows[0].company_id, authUser.company_id)) {

            return res.status(403).json({
                success: false,
                message: "You can access only your company customers"
            });

        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {

        console.log("CUSTOMER DETAILS ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ================= UPDATE =================

exports.updateCustomer = async (req, res) => {

    try {

        const {
            customer_id,
            customer_name,
            company_name,
            email,
            phone,
            alternate_phone,
            gst_number,
            website,
            address,
            city,
            state,
            country,
            pincode,
            status
        } = req.body;

        if (!customer_id) {
            return res.status(400).json({
                success: false,
                message: "Customer Id is required"
            });
        }

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        const customer = await pool.query(
            `SELECT company_id
             FROM customers
             WHERE id = $1
               AND deleted_at IS NULL`,
            [customer_id]
        );

        if (customer.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer Not Found"
            });
        }

        // Company isolation for every non-Admin role.
        if (authUser.role !== ROLES.ADMIN &&
            !sameCompany(customer.rows[0].company_id, authUser.company_id)) {

            return res.status(403).json({
                success: false,
                message: "You can update only your company customers"
            });

        }

        await pool.query(
            `UPDATE customers
             SET customer_name   = COALESCE($1, customer_name),
                 company_name    = $2,
                 email           = $3,
                 phone           = COALESCE($4, phone),
                 alternate_phone = $5,
                 gst_number      = $6,
                 website         = $7,
                 address         = $8,
                 city            = $9,
                 state           = $10,
                 country         = $11,
                 pincode         = $12,
                 status          = COALESCE($13, status),
                 updated_at      = NOW()
             WHERE id = $14`,
            [
                customer_name ? String(customer_name).trim() : null,
                company_name ?? null,
                email ?? null,
                phone || null,
                alternate_phone ?? null,
                gst_number ?? null,
                website ?? null,
                address ?? null,
                city ?? null,
                state ?? null,
                country ?? null,
                pincode ?? null,
                toBoolean(status),
                customer_id
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Customer Updated Successfully"
        });

    } catch (error) {

        console.log("UPDATE CUSTOMER ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ================= DELETE (soft) =================

exports.deleteCustomer = async (req, res) => {

    try {

        const { customer_id } = req.body;

        if (!customer_id) {
            return res.status(400).json({
                success: false,
                message: "Customer Id is required"
            });
        }

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        const customer = await pool.query(
            `SELECT id, company_id
             FROM customers
             WHERE id = $1
               AND deleted_at IS NULL`,
            [customer_id]
        );

        if (customer.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer Not Found"
            });
        }

        if (authUser.role !== ROLES.ADMIN &&
            !sameCompany(customer.rows[0].company_id, authUser.company_id)) {

            return res.status(403).json({
                success: false,
                message: "You can delete only your company customers"
            });

        }

        await pool.query(
            `UPDATE customers
             SET deleted_at = NOW()
             WHERE id = $1`,
            [customer_id]
        );

        return res.status(200).json({
            success: true,
            message: "Customer Deleted Successfully"
        });

    } catch (error) {

        console.log("DELETE CUSTOMER ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};
