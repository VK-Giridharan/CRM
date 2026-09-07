const pool = require("../database/connection");
const { getAuthContext } = require("../utils/authContext");
const { ROLES } = require("../utils/status");

const {
    parseId,
    validateName,
    validateEmail,
    validatePhone,
    validateText,
    validateShortText,
    firstError
} = require("../utils/validation");

// ======================================================
// WHO MAY WRITE A CUSTOMER
//
// createCustomer has always been Manager-only. updateCustomer and
// deleteCustomer checked company membership but never the caller's role, so
// an Employee or an Intern could edit or soft-delete any customer in their
// own company (report BUG-005, CRITICAL).
//
// Admin is kept because the existing update/delete handlers already carve
// Admin out of the company check and act as a global administrator there.
// Team Lead, Employee and Intern are read-only on customers.
// ======================================================
const CUSTOMER_WRITE_ROLES = [ROLES.ADMIN, ROLES.MANAGER];

// Columns a client is allowed to update, mapped to their validator.
// Anything not listed here can never be written by updateCustomer.
const CUSTOMER_UPDATABLE_FIELDS = {
    customer_name: (v) => validateName(v, "Customer name"),
    company_name: (v) => validateName(v, "Company name", { required: false }),
    email: (v) => validateEmail(v, { required: false }),
    phone: (v) => validatePhone(v),
    alternate_phone: (v) => validatePhone(v, { required: false, label: "Alternate phone" }),
    gst_number: (v) => validateShortText(v, "GST number"),
    website: (v) => validateShortText(v, "Website"),
    address: (v) => validateText(v, "Address"),
    city: (v) => validateName(v, "City", { required: false }),
    state: (v) => validateName(v, "State", { required: false }),
    country: (v) => validateName(v, "Country", { required: false }),
    pincode: (v) => validateShortText(v, "Pincode")
};

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

        // Format validation. Previously nothing beyond presence was checked,
        // so "not-an-email", "abcdefghij" and a 25-digit phone (which
        // overflowed varchar(20) and became a 500) all got through.
        const validationError = firstError([
            validateName(customer_name, "Customer name"),
            validateName(company_name, "Company name", { required: false }),
            validatePhone(phone),
            validatePhone(alternate_phone, { required: false, label: "Alternate phone" }),
            validateEmail(email, { required: false }),
            validateShortText(gst_number, "GST number"),
            validateShortText(website, "Website"),
            validateText(address, "Address"),
            validateName(city, "City", { required: false }),
            validateName(state, "State", { required: false }),
            validateName(country, "Country", { required: false }),
            validateShortText(pincode, "Pincode")
        ]);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
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

        // Duplicate detection, scoped to the caller's own company so it can
        // never reveal anything about another tenant's customers.
        // Soft-deleted rows are ignored, so a deleted customer's phone can
        // be reused.
        const duplicate = await pool.query(
            `SELECT id
             FROM customers
             WHERE company_id = $1
               AND phone = $2
               AND deleted_at IS NULL`,
            [authUser.company_id, String(phone).trim()]
        );

        if (duplicate.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "A customer with this phone number already exists"
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

        const id = parseId(customer_id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid Customer Id"
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
            [id]
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

        const { customer_id, status } = req.body;

        if (!customer_id) {
            return res.status(400).json({
                success: false,
                message: "Customer Id is required"
            });
        }

        const id = parseId(customer_id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid Customer Id"
            });
        }

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        // Role gate (BUG-005). Team Lead / Employee / Intern are read-only on
        // customers; only Admin and Manager may write.
        if (!CUSTOMER_WRITE_ROLES.includes(authUser.role)) {
            return res.status(403).json({
                success: false,
                message: "Only Admin or Manager can update customers"
            });
        }

        const customer = await pool.query(
            `SELECT company_id
             FROM customers
             WHERE id = $1
               AND deleted_at IS NULL`,
            [id]
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

        // --------------------------------------------------
        // PARTIAL UPDATE (BUG-006)
        //
        // The previous statement assigned every optional column directly, so
        // any field the caller omitted was overwritten with NULL and the
        // rest of the customer record was silently destroyed.
        //
        // Now only keys actually present in the request body are written:
        //   key absent      -> column untouched
        //   key present     -> column set to that value
        //   key present ""  -> column explicitly cleared to NULL
        //
        // The field list is a fixed whitelist, so nothing outside
        // CUSTOMER_UPDATABLE_FIELDS can ever be written from the body.
        // --------------------------------------------------
        const setClauses = [];
        const values = [];

        for (const [field, validate] of Object.entries(CUSTOMER_UPDATABLE_FIELDS)) {

            if (!Object.prototype.hasOwnProperty.call(req.body, field)) {
                continue;
            }

            const raw = req.body[field];

            // An explicitly blank optional field clears the column.
            const isBlank =
                raw === null || raw === undefined || String(raw).trim() === "";

            if (isBlank) {

                // customer_name and phone are NOT NULL / required - refuse to
                // blank them rather than corrupting the row.
                if (field === "customer_name" || field === "phone") {
                    return res.status(400).json({
                        success: false,
                        message: field === "phone"
                            ? "Phone number is required"
                            : "Customer name is required"
                    });
                }

                values.push(null);
                setClauses.push(`${field} = $${values.length}`);
                continue;

            }

            const error = validate(raw);

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error
                });
            }

            values.push(String(raw).trim());
            setClauses.push(`${field} = $${values.length}`);

        }

        // status is a boolean column and is handled separately.
        if (Object.prototype.hasOwnProperty.call(req.body, "status")) {

            const boolStatus = toBoolean(status);

            if (boolStatus === null) {
                return res.status(400).json({
                    success: false,
                    message: "Status must be true or false"
                });
            }

            values.push(boolStatus);
            setClauses.push(`status = $${values.length}`);

        }

        if (setClauses.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields to update"
            });
        }

        // Phone uniqueness inside the company, mirroring create.
        if (Object.prototype.hasOwnProperty.call(req.body, "phone")) {

            const clash = await pool.query(
                `SELECT id
                 FROM customers
                 WHERE company_id = $1
                   AND phone = $2
                   AND id <> $3
                   AND deleted_at IS NULL`,
                [customer.rows[0].company_id, String(req.body.phone).trim(), id]
            );

            if (clash.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "A customer with this phone number already exists"
                });
            }

        }

        values.push(id);

        await pool.query(
            `UPDATE customers
             SET ${setClauses.join(", ")},
                 updated_at = NOW()
             WHERE id = $${values.length}`,
            values
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

        const id = parseId(customer_id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid Customer Id"
            });
        }

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        // Role gate (BUG-005). An Intern was previously able to soft-delete
        // any customer in their own company.
        if (!CUSTOMER_WRITE_ROLES.includes(authUser.role)) {
            return res.status(403).json({
                success: false,
                message: "Only Admin or Manager can delete customers"
            });
        }

        const customer = await pool.query(
            `SELECT id, company_id
             FROM customers
             WHERE id = $1
               AND deleted_at IS NULL`,
            [id]
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
            [id]
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
