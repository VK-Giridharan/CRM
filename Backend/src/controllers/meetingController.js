const pool = require("../database/connection");

exports.createMeeting = async (req, res) => {

    try {

        const {
            lead_id,
            meeting_title,
            meeting_date,
            meeting_time,
            meeting_type,
            location,
            description
        } = req.body;

        // ================= VALIDATION =================

        if (
            !lead_id ||
            !meeting_title ||
            !meeting_date ||
            !meeting_time
        ) {

            return res.status(400).json({
                success: false,
                message: "Lead, Title, Date and Time are Required"
            });

        }

        // ================= GET MANAGER =================

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
            SELECT *
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

        // ================= CHECK LEAD STATUS =================

        if (
            lead.rows[0].status === "Converted" ||
            lead.rows[0].status === "Closed"
        ) {

            return res.status(400).json({
                success: false,
                message: "Meeting Cannot Be Created For This Lead"
            });

        }

        // ================= INSERT MEETING =================

        const result = await pool.query(
            `
            INSERT INTO meetings
            (
                lead_id,
                company_id,
                manager_id,
                meeting_title,
                meeting_date,
                meeting_time,
                meeting_type,
                location,
                description,
                created_by
            )
            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
            )
            RETURNING *
            `,
            [
                lead_id,
                company_id,
                req.user.id,
                meeting_title,
                meeting_date,
                meeting_time,
                meeting_type,
                location,
                description,
                req.user.id
            ]
        );

        // ================= UPDATE LEAD STATUS =================

        await pool.query(
            `
            UPDATE leads
            SET
                status='Meeting Scheduled',
                updated_by=$1,
                updated_at=CURRENT_TIMESTAMP
            WHERE id=$2
            `,
            [
                req.user.id,
                lead_id
            ]
        );

        return res.status(201).json({

            success: true,

            message: "Meeting Created Successfully",

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

exports.getMeetingList = async (req, res) => {

    try {

        // ================= GET MANAGER =================

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

        // ================= GET MEETINGS =================

        const result = await pool.query(
            `
            SELECT

                m.id,

                m.meeting_title,

                m.meeting_date,

                m.meeting_time,

                m.meeting_type,

                m.location,

                m.status,

                m.meeting_result,

                l.id AS lead_id,

                l.lead_name,

                l.company_name,

                l.phone,

                l.email

            FROM meetings m

            INNER JOIN leads l
                ON m.lead_id = l.id

            WHERE
                m.company_id = $1

            ORDER BY
                m.meeting_date DESC,
                m.meeting_time DESC
            `,
            [company_id]
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

exports.getMeetingDetails = async (req, res) => {

    try {

        const { meeting_id } = req.body;

        // ================= VALIDATION =================

        if (!meeting_id) {

            return res.status(400).json({
                success: false,
                message: "Meeting ID is Required"
            });

        }

        // ================= GET MANAGER =================

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

        // ================= GET MEETING =================

        const result = await pool.query(
            `
            SELECT

                m.*,

                l.lead_name,

                l.company_name,

                l.phone,

                l.email,

                l.source,

                l.status AS lead_status

            FROM meetings m

            INNER JOIN leads l
                ON m.lead_id = l.id

            WHERE
                m.id = $1
                AND m.company_id = $2
            `,
            [
                meeting_id,
                company_id
            ]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Meeting Not Found"
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

exports.updateMeeting = async (req, res) => {

    try {

        const {
            meeting_id,
            meeting_title,
            meeting_date,
            meeting_time,
            meeting_type,
            location,
            description
        } = req.body;

        // ================= VALIDATION =================

        if (
            !meeting_id ||
            !meeting_title ||
            !meeting_date ||
            !meeting_time
        ) {

            return res.status(400).json({
                success: false,
                message: "Meeting ID, Title, Date and Time are Required"
            });

        }

        // ================= GET MANAGER =================

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

        // ================= CHECK MEETING =================

        const meeting = await pool.query(
            `
            SELECT *
            FROM meetings
            WHERE id = $1
            AND company_id = $2
            `,
            [
                meeting_id,
                company_id
            ]
        );

        if (meeting.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Meeting Not Found"
            });

        }

        if (
            meeting.rows[0].status === "Completed" ||
            meeting.rows[0].status === "Cancelled"
        ) {

            return res.status(400).json({
                success: false,
                message: "Completed or Cancelled Meeting Cannot Be Updated"
            });

        }

        // ================= UPDATE =================

        const result = await pool.query(
            `
            UPDATE meetings
            SET
                meeting_title = $1,
                meeting_date = $2,
                meeting_time = $3,
                meeting_type = $4,
                location = $5,
                description = $6,
                updated_by = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
            `,
            [
                meeting_title,
                meeting_date,
                meeting_time,
                meeting_type,
                location,
                description,
                req.user.id,
                meeting_id
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Meeting Updated Successfully",
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

exports.deleteMeeting = async (req, res) => {

    try {

        const { meeting_id } = req.body;

        // ================= VALIDATION =================

        if (!meeting_id) {

            return res.status(400).json({
                success: false,
                message: "Meeting ID is Required"
            });

        }

        // ================= GET MANAGER =================

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

        // ================= CHECK MEETING =================

        const meeting = await pool.query(
            `
            SELECT *
            FROM meetings
            WHERE id = $1
            AND company_id = $2
            `,
            [
                meeting_id,
                company_id
            ]
        );

        if (meeting.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Meeting Not Found"
            });

        }

        if (meeting.rows[0].status === "Completed") {

            return res.status(400).json({
                success: false,
                message: "Completed Meeting Cannot Be Deleted"
            });

        }

        // ================= DELETE =================

        await pool.query(
            `
            DELETE FROM meetings
            WHERE id = $1
            `,
            [meeting_id]
        );

        // ================= UPDATE LEAD STATUS =================

        const meetingCount = await pool.query(
            `
            SELECT COUNT(*)
            FROM meetings
            WHERE lead_id = $1
            `,
            [meeting.rows[0].lead_id]
        );

        if (Number(meetingCount.rows[0].count) === 0) {

            await pool.query(
                `
                UPDATE leads
                SET
                    status = 'Pending',
                    updated_by = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                `,
                [
                    req.user.id,
                    meeting.rows[0].lead_id
                ]
            );

        }

        return res.status(200).json({

            success: true,

            message: "Meeting Deleted Successfully"

        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({

            success: false,

            message: "Internal Server Error"

        });

    }

};

exports.completeMeeting = async (req, res) => {

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const {
            meeting_id,
            meeting_result,
            next_meeting_date
        } = req.body;

        // ================= VALIDATION =================

        if (!meeting_id || !meeting_result) {

            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Meeting ID and Meeting Result are Required"
            });

        }

        // ================= VALID RESULT =================

        const validResult = [
            "Converted",
            "Future Business",
            "Closed"
        ];

        if (!validResult.includes(meeting_result)) {

            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Invalid Meeting Result"
            });

        }

        // Future Business -> Next Meeting Date Required

        if (meeting_result === "Future Business" && !next_meeting_date) {

            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Next Meeting Date is Required"
            });

        }

        // ================= GET MANAGER =================

        const manager = await client.query(
            `
            SELECT company_id
            FROM users
            WHERE id = $1
            `,
            [req.user.id]
        );

        if (manager.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Manager Not Found"
            });

        }

        // ================= GET MEETING =================

        const meeting = await client.query(
            `
            SELECT *
            FROM meetings
            WHERE id = $1
            AND company_id = $2
            `,
            [
                meeting_id,
                manager.rows[0].company_id
            ]
        );

        if (meeting.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Meeting Not Found"
            });

        }

        // ================= ALREADY COMPLETED =================

        if (meeting.rows[0].status === "Completed") {

            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Meeting Already Completed"
            });

        }

        // ================= UPDATE MEETING =================

        await client.query(
            `
            UPDATE meetings
            SET
                status = 'Completed',
                meeting_result = $1,
                next_meeting_date = $2,
                updated_by = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            `,
            [
                meeting_result,
                next_meeting_date || null,
                req.user.id,
                meeting_id
            ]
        );

        // ================= UPDATE LEAD =================

        if (meeting_result === "Converted") {

            await client.query(
                `
                UPDATE leads
                SET
                    status = 'Converted',
                    updated_by = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                `,
                [
                    req.user.id,
                    meeting.rows[0].lead_id
                ]
            );

        }

        else if (meeting_result === "Future Business") {

            await client.query(
                `
                UPDATE leads
                SET
                    status = 'Future Business',
                    updated_by = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                `,
                [
                    req.user.id,
                    meeting.rows[0].lead_id
                ]
            );

        }

        else if (meeting_result === "Closed") {

            await client.query(
                `
                UPDATE leads
                SET
                    status = 'Closed',
                    updated_by = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                `,
                [
                    req.user.id,
                    meeting.rows[0].lead_id
                ]
            );

        }

        // ================= COMMIT =================

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: "Meeting Completed Successfully"
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    } finally {

        client.release();

    }

};