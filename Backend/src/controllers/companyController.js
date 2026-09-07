const pool = require("../database/connection");
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
// Company routes are wrapped in requireRole(...) so req.authUser is always
// present here and carries the caller's freshly-read role / company_id.
// ======================================================

// ================= CREATE COMPANY (Admin only) =================

exports.createCompany = async (req, res) => {
    try {

        const {
            company_name,
            company_code,
            email,
            phone,
            address,
            city,
            state,
            country,
            pincode,
            logo
        } = req.body;

        if (!company_name || !String(company_name).trim() ||
            !company_code || !String(company_code).trim()) {

            return res.status(400).json({
                success: false,
                message: "Company Name and Company Code are required"
            });

        }

        const validationError = firstError([
            validateName(company_name, "Company name"),
            validateShortText(company_code, "Company code"),
            validateEmail(email, { required: false }),
            validatePhone(phone, { required: false }),
            validateText(address, "Address"),
            validateName(city, "City", { required: false }),
            validateName(state, "State", { required: false }),
            validateName(country, "Country", { required: false }),
            validateShortText(pincode, "Pincode"),
            validateShortText(logo, "Logo")
        ]);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const check = await pool.query(
            `SELECT id FROM companies
             WHERE LOWER(company_code) = LOWER($1)
                OR LOWER(company_name) = LOWER($2)`,
            [String(company_code).trim(), String(company_name).trim()]
        );

        if (check.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Company already exists"
            });
        }

        const result = await pool.query(
            `INSERT INTO companies
            (
                company_name, company_code, email, phone, address,
                city, state, country, pincode, logo, created_by
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *`,
            [
                String(company_name).trim(),
                String(company_code).trim(),
                email || null,
                phone || null,
                address || null,
                city || null,
                state || null,
                country || null,
                pincode || null,
                logo || null,
                req.user.id
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Company Created Successfully",
            data: result.rows[0]
        });

    } catch (error) {

        console.log("CREATE COMPANY ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }
};

// ================= COMPANY LIST =================
// Admin sees every company. A Manager sees only their own company row, so
// this endpoint cannot be used to enumerate other tenants.

exports.companyList = async (req, res) => {

    try {

        const authUser = req.authUser;

        if (authUser.role === ROLES.ADMIN) {

            const result = await pool.query(
                `SELECT * FROM companies ORDER BY id DESC`
            );

            return res.status(200).json({
                success: true,
                count: result.rows.length,
                data: result.rows
            });

        }

        if (!authUser.company_id) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: []
            });
        }

        const result = await pool.query(
            `SELECT * FROM companies WHERE id = $1`,
            [authUser.company_id]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.log("COMPANY LIST ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ================= COMPANY DETAILS =================

exports.companyDetails = async (req, res) => {

    try {

        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Company Id is required"
            });
        }

        const companyId = parseId(id);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Company Id"
            });
        }

        const authUser = req.authUser;

        // A Manager may only read their own company.
        if (authUser.role !== ROLES.ADMIN &&
            companyId !== Number(authUser.company_id)) {

            return res.status(403).json({
                success: false,
                message: "You can access only your own company"
            });

        }

        const result = await pool.query(
            `SELECT * FROM companies WHERE id = $1`,
            [companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company Not Found"
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {

        console.log("COMPANY DETAILS ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ================= UPDATE COMPANY (Admin only) =================

exports.updateCompany = async (req, res) => {

    try {

        const {
            id,
            company_name,
            company_code,
            email,
            phone,
            address,
            city,
            state,
            country,
            pincode,
            logo,
            status
        } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Company Id is required"
            });
        }

        const companyId = parseId(id);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Company Id"
            });
        }

        const validationError = firstError([
            validateName(company_name, "Company name", { required: false }),
            validateShortText(company_code, "Company code"),
            validateEmail(email, { required: false }),
            validatePhone(phone, { required: false }),
            validateText(address, "Address"),
            validateName(city, "City", { required: false }),
            validateName(state, "State", { required: false }),
            validateName(country, "Country", { required: false }),
            validateShortText(pincode, "Pincode"),
            validateShortText(logo, "Logo")
        ]);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const check = await pool.query(
            `SELECT id FROM companies WHERE id = $1`,
            [companyId]
        );

        if (check.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company Not Found"
            });
        }

        // Another company must not already hold this name/code.
        if (company_name || company_code) {

            const clash = await pool.query(
                `SELECT id FROM companies
                 WHERE (LOWER(company_code) = LOWER($1)
                     OR LOWER(company_name) = LOWER($2))
                   AND id <> $3`,
                [
                    company_code ? String(company_code).trim() : "",
                    company_name ? String(company_name).trim() : "",
                    companyId
                ]
            );

            if (clash.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Another company already uses that name or code"
                });
            }

        }

        // COALESCE so an omitted field keeps its current value instead of
        // being overwritten with NULL.
        const result = await pool.query(
            `UPDATE companies
             SET company_name = COALESCE($1, company_name),
                 company_code = COALESCE($2, company_code),
                 email        = COALESCE($3, email),
                 phone        = COALESCE($4, phone),
                 address      = COALESCE($5, address),
                 city         = COALESCE($6, city),
                 state        = COALESCE($7, state),
                 country      = COALESCE($8, country),
                 pincode      = COALESCE($9, pincode),
                 logo         = COALESCE($10, logo),
                 status       = COALESCE($11, status),
                 updated_at   = NOW()
             WHERE id = $12
             RETURNING *`,
            [
                company_name ? String(company_name).trim() : null,
                company_code ? String(company_code).trim() : null,
                email ?? null,
                phone ?? null,
                address ?? null,
                city ?? null,
                state ?? null,
                country ?? null,
                pincode ?? null,
                logo ?? null,
                typeof status === "boolean" ? status : null,
                companyId
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Company Updated Successfully",
            data: result.rows[0]
        });

    } catch (error) {

        console.log("UPDATE COMPANY ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ================= DELETE COMPANY (Admin only) =================
//
// companies has dependent rows in users / customers / leads / meetings with
// no ON DELETE action, so a blind DELETE raises a foreign key violation that
// previously surfaced as a generic 500. Dependents are counted first and the
// caller gets an actionable 400 instead.

exports.deleteCompany = async (req, res) => {

    try {

        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Company Id is required"
            });
        }

        const companyId = parseId(id);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Company Id"
            });
        }

        const check = await pool.query(
            `SELECT id FROM companies WHERE id = $1`,
            [companyId]
        );

        if (check.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company Not Found"
            });
        }

        const dependents = await pool.query(
            `SELECT
                (SELECT COUNT(*) FROM users     WHERE company_id = $1) AS users,
                (SELECT COUNT(*) FROM customers WHERE company_id = $1) AS customers,
                (SELECT COUNT(*) FROM leads     WHERE company_id = $1) AS leads,
                (SELECT COUNT(*) FROM meetings  WHERE company_id = $1) AS meetings`,
            [companyId]
        );

        const counts = dependents.rows[0];

        const blocking = Object.entries(counts)
            .filter(([, value]) => Number(value) > 0)
            .map(([key, value]) => `${value} ${key}`);

        if (blocking.length > 0) {
            return res.status(400).json({
                success: false,
                message:
                    `This company still has ${blocking.join(", ")}. ` +
                    "Reassign or remove them first, or deactivate the company instead."
            });
        }

        await pool.query(`DELETE FROM companies WHERE id = $1`, [companyId]);

        return res.status(200).json({
            success: true,
            message: "Company Deleted Successfully"
        });

    } catch (error) {

        console.log("DELETE COMPANY ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};
