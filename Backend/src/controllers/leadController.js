const pool = require("../database/connection");

const {
    parseId,
    validateName,
    validateEmail,
    validatePhone,
    validateText,
    validateShortText,
    firstError
} = require("../utils/validation");

exports.createLead = async (req, res) => {

    try {

        const {
            lead_name,
            company_name,
            email,
            phone,
            source,
            address,
            city,
            state,
            country,
            pincode,
            remarks,
            requirement
        } = req.body;

        // ================= VALIDATION =================

        if (!lead_name || !phone) {

            return res.status(400).json({
                success: false,
                message: "Lead Name and Phone Number are Required"
            });

        }

        const validationError = firstError([
            validateName(lead_name, "Lead name"),
            validateName(company_name, "Company name", { required: false }),
            validatePhone(phone),
            validateEmail(email, { required: false }),
            validateShortText(source, "Source"),
            validateText(address, "Address"),
            validateName(city, "City", { required: false }),
            validateName(state, "State", { required: false }),
            validateName(country, "Country", { required: false }),
            validateShortText(pincode, "Pincode"),
            validateText(remarks, "Remarks"),
            validateText(requirement, "Requirement")
        ]);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        // ================= GET MANAGER DETAILS =================

        const manager = await pool.query(
            `
            SELECT company_id
            FROM users
            WHERE id=$1
            `,
            [req.user.id]
        );

        if (manager.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Manager Not Found"
            });

        }

        const company_id = manager.rows[0].company_id;

        // ================= DUPLICATE PHONE =================

        // Duplicate checks are scoped to the caller's own company. They used
        // to query every tenant's leads, which both blocked two companies from
        // ever holding the same prospect and let one tenant probe whether a
        // phone/email existed in another (report BUG-007).
        const phoneCheck = await pool.query(
            `
            SELECT id
            FROM leads
            WHERE phone=$1
            AND company_id=$2
            `,
            [phone, company_id]
        );

        if (phoneCheck.rows.length > 0) {

            return res.status(400).json({
                success: false,
                message: "Phone Number Already Exists"
            });

        }

        // ================= DUPLICATE EMAIL =================

        if (email) {

            const emailCheck = await pool.query(
                `
                SELECT id
                FROM leads
                WHERE email=$1
                AND company_id=$2
                `,
                [email, company_id]
            );

            if (emailCheck.rows.length > 0) {

                return res.status(400).json({
                    success: false,
                    message: "Email Already Exists"
                });

            }

        }

        // ================= INSERT =================

        const result = await pool.query(
            `
            INSERT INTO leads
            (
                company_id,
                manager_id,
                lead_name,
                company_name,
                email,
                phone,
                source,
                address,
                city,
                state,
                country,
                pincode,
                remarks,
                requirement,
                created_by
            )
            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
            )
            RETURNING *
            `,
            [
                company_id,
                req.user.id,
                lead_name,
                company_name,
                email,
                phone,
                source,
                address,
                city,
                state,
                country,
                pincode,
                remarks,
                requirement || null,
                req.user.id
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Lead Created Successfully",
            data: result.rows[0]
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

exports.getLeadList = async (req, res) => {

    try {

        // ================= GET MANAGER COMPANY =================

        const manager = await pool.query(
            `
            SELECT company_id
            FROM users
            WHERE id=$1
            `,
            [req.user.id]
        );

        if (manager.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Manager Not Found"
            });

        }

        // ================= GET LEADS =================

        const result = await pool.query(
            `
            SELECT
                l.id,
                l.lead_name,
                l.company_name,
                l.email,
                l.phone,
                l.source,
                l.address,
                l.city,
                l.state,
                l.country,
                l.pincode,
                l.status,
                l.remarks,
                l.requirement,
                l.created_at,
                u.first_name,
                u.last_name
            FROM leads l
            INNER JOIN users u
                ON l.manager_id = u.id
            WHERE l.company_id = $1
            ORDER BY l.created_at DESC
            `,
            [manager.rows[0].company_id]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

exports.getLeadDetails = async (req, res) => {

    try {

        const { lead_id } = req.body;

        // ================= VALIDATION =================

        if (!lead_id) {

            return res.status(400).json({
                success: false,
                message: "Lead ID is Required"
            });

        }

        const leadId = parseId(lead_id);

        if (!leadId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Lead ID"
            });
        }

        // ================= GET MANAGER COMPANY =================

        const manager = await pool.query(
            `
            SELECT company_id
            FROM users
            WHERE id = $1
            `,
            [req.user.id]
        );

        if (manager.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Manager Not Found"
            });

        }

        // ================= GET LEAD =================

        const result = await pool.query(
            `
            SELECT
                l.*,
                u.first_name,
                u.last_name
            FROM leads l
            INNER JOIN users u
                ON l.manager_id = u.id
            WHERE
                l.id = $1
                AND l.company_id = $2
            `,
            [
                leadId,
                manager.rows[0].company_id
            ]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Lead Not Found"
            });

        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

exports.updateLead = async (req, res) => {

    try {

        const {
            lead_id,
            lead_name,
            company_name,
            email,
            phone,
            source,
            address,
            city,
            state,
            country,
            pincode,
            remarks,
            requirement
        } = req.body;

        // ================= VALIDATION =================

        if (!lead_id || !lead_name || !phone) {

            return res.status(400).json({
                success: false,
                message: "Lead ID, Lead Name and Phone Number are Required"
            });

        }

        const leadId = parseId(lead_id);

        if (!leadId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Lead ID"
            });
        }

        const validationError = firstError([
            validateName(lead_name, "Lead name"),
            validateName(company_name, "Company name", { required: false }),
            validatePhone(phone),
            validateEmail(email, { required: false }),
            validateShortText(source, "Source"),
            validateText(address, "Address"),
            validateName(city, "City", { required: false }),
            validateName(state, "State", { required: false }),
            validateName(country, "Country", { required: false }),
            validateShortText(pincode, "Pincode"),
            validateText(remarks, "Remarks"),
            validateText(requirement, "Requirement")
        ]);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        // ================= GET MANAGER COMPANY =================

        const manager = await pool.query(
            `
            SELECT company_id
            FROM users
            WHERE id = $1
            `,
            [req.user.id]
        );

        if (manager.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Manager Not Found"
            });

        }

        const company_id = manager.rows[0].company_id;

        // ================= CHECK LEAD =================

        const lead = await pool.query(
            `
            SELECT id
            FROM leads
            WHERE id = $1
            AND company_id = $2
            `,
            [
                leadId,
                company_id
            ]
        );

        if (lead.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Lead Not Found"
            });

        }

        // ========== DUPLICATE PHONE (own company only - BUG-007) ==========

        const phoneCheck = await pool.query(
            `
            SELECT id
            FROM leads
            WHERE phone = $1
            AND id <> $2
            AND company_id = $3
            `,
            [
                phone,
                leadId,
                company_id
            ]
        );

        if (phoneCheck.rows.length > 0) {

            return res.status(400).json({
                success: false,
                message: "Phone Number Already Exists"
            });

        }

        // ================= DUPLICATE EMAIL =================

        if (email) {

            const emailCheck = await pool.query(
                `
                SELECT id
                FROM leads
                WHERE email = $1
                AND id <> $2
                AND company_id = $3
                `,
                [
                    email,
                    leadId,
                    company_id
                ]
            );

            if (emailCheck.rows.length > 0) {

                return res.status(400).json({
                    success: false,
                    message: "Email Already Exists"
                });

            }

        }

        // ================= UPDATE =================
        //
        // PARTIAL UPDATE (NEW-BUG-001, same class as BUG-006 / BUG-012).
        //
        // Every optional column used to be assigned directly, so a caller who
        // sent only lead_name + phone silently wiped the lead's email,
        // source, city, address, remarks and requirement. Only keys actually
        // present in the request body are written now:
        //   key absent     -> column untouched
        //   key present    -> column set
        //   key present "" -> column explicitly cleared
        //
        // lead_name and phone are required by the validation above, so they
        // are always written.

        const has = (key) =>
            Object.prototype.hasOwnProperty.call(req.body, key);

        const setClauses = [];
        const values = [];

        const push = (column, value) => {
            values.push(value);
            setClauses.push(`${column} = $${values.length}`);
        };

        push("lead_name", lead_name);
        push("phone", phone);

        const optional = {
            company_name,
            email,
            source,
            address,
            city,
            state,
            country,
            pincode,
            remarks,
            requirement
        };

        for (const [column, value] of Object.entries(optional)) {

            if (!has(column)) continue;

            const isBlank =
                value === null || value === undefined || String(value).trim() === "";

            push(column, isBlank ? null : value);

        }

        push("updated_by", req.user.id);

        values.push(leadId);

        const result = await pool.query(
            `
            UPDATE leads
            SET ${setClauses.join(", ")},
                updated_at = CURRENT_TIMESTAMP
            WHERE
                id = $${values.length}
            RETURNING *
            `,
            values
        );

        return res.status(200).json({
            success: true,
            message: "Lead Updated Successfully",
            data: result.rows[0]
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

exports.deleteLead = async (req, res) => {

    try {

        const { lead_id } = req.body;

        // ================= VALIDATION =================

        if (!lead_id) {

            return res.status(400).json({
                success: false,
                message: "Lead ID is Required"
            });

        }

        const leadId = parseId(lead_id);

        if (!leadId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Lead ID"
            });
        }

        // ================= GET MANAGER COMPANY =================

        const manager = await pool.query(
            `
            SELECT company_id
            FROM users
            WHERE id = $1
            `,
            [req.user.id]
        );

        if (manager.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Manager Not Found"
            });

        }

        // ================= CHECK LEAD =================

        const lead = await pool.query(
            `
            SELECT id
            FROM leads
            WHERE id = $1
            AND company_id = $2
            `,
            [
                leadId,
                manager.rows[0].company_id
            ]
        );

        if (lead.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Lead Not Found"
            });

        }

        // ================= DELETE =================

        await pool.query(
            `
            DELETE FROM leads
            WHERE id = $1
            `,
            [leadId]
        );

        return res.status(200).json({
            success: true,
            message: "Lead Deleted Successfully"
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

exports.updateLeadStatus = async (req, res) => {

    try {

        const {
            lead_id,
            status
        } = req.body;

        // ================= VALIDATION =================

        if (!lead_id || !status) {

            return res.status(400).json({
                success: false,
                message: "Lead ID and Status are Required"
            });

        }

        const leadId = parseId(lead_id);

        if (!leadId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Lead ID"
            });
        }

        // ================= VALID STATUS =================

        const validStatus = [
            "Pending",
            "Meeting Scheduled",
            "Future Business",
            "Converted",
            "Closed"
        ];

        if (!validStatus.includes(status)) {

            return res.status(400).json({
                success: false,
                message: "Invalid Lead Status"
            });

        }

        // ================= GET MANAGER COMPANY =================

        const manager = await pool.query(
            `
            SELECT company_id
            FROM users
            WHERE id = $1
            `,
            [req.user.id]
        );

        if (manager.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Manager Not Found"
            });

        }

        // ================= CHECK LEAD =================

        const lead = await pool.query(
            `
            SELECT id
            FROM leads
            WHERE id = $1
            AND company_id = $2
            `,
            [
                leadId,
                manager.rows[0].company_id
            ]
        );

        if (lead.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Lead Not Found"
            });

        }

        // ================= UPDATE STATUS =================

        const result = await pool.query(
            `
            UPDATE leads
            SET
                status = $1,
                updated_by = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE
                id = $3
            RETURNING *
            `,
            [
                status,
                req.user.id,
                leadId
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Lead Status Updated Successfully",
            data: result.rows[0]
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};