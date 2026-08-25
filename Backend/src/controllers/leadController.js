const pool = require("../database/connection");

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
            remarks
        } = req.body;

        // ================= VALIDATION =================

        if (!lead_name || !phone) {

            return res.status(400).json({
                success: false,
                message: "Lead Name and Phone Number are Required"
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

        const phoneCheck = await pool.query(
            `
            SELECT id
            FROM leads
            WHERE phone=$1
            `,
            [phone]
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
                `,
                [email]
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
                created_by
            )
            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
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
                lead_id,
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
            remarks
        } = req.body;

        // ================= VALIDATION =================

        if (!lead_id || !lead_name || !phone) {

            return res.status(400).json({
                success: false,
                message: "Lead ID, Lead Name and Phone Number are Required"
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
                lead_id,
                company_id
            ]
        );

        if (lead.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Lead Not Found"
            });

        }

        // ================= DUPLICATE PHONE =================

        const phoneCheck = await pool.query(
            `
            SELECT id
            FROM leads
            WHERE phone = $1
            AND id <> $2
            `,
            [
                phone,
                lead_id
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
                `,
                [
                    email,
                    lead_id
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

        const result = await pool.query(
            `
            UPDATE leads
            SET
                lead_name = $1,
                company_name = $2,
                email = $3,
                phone = $4,
                source = $5,
                address = $6,
                city = $7,
                state = $8,
                country = $9,
                pincode = $10,
                remarks = $11,
                updated_by = $12,
                updated_at = CURRENT_TIMESTAMP
            WHERE
                id = $13
            RETURNING *
            `,
            [
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
                req.user.id,
                lead_id
            ]
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
                lead_id,
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
            [lead_id]
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
                lead_id,
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
                lead_id
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