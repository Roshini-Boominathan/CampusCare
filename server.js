
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const multer = require("multer");
const session = require("express-session");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    name: "campuscare.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 30 * 60 * 1000
    }
}));

app.use(express.static(path.join(__dirname, "public")));

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use("/uploads", express.static(uploadDir));

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const safeName = Date.now() + "-" +
            Math.round(Math.random() * 1e9) + extension;

        cb(null, safeName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp"];

        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG, PNG and WEBP images are allowed."));
        }
    }
});

function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }

    return res.status(401).json({
        message: "Administrator login required."
    });
}

// Check server and database connection
app.get("/api/health", async (req, res) => {
    try {
        await db.query("SELECT 1");
        res.json({ message: "CampusCare server and database are running." });
    } catch (error) {
        res.status(500).json({ message: "Database connection failed." });
    }
});

// Submit a complaint
app.post("/api/complaints", (req, res, next) => {
    upload.single("photo")(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        const {
            studentName,
            studentEmail,
            category,
            location,
            title,
            description
        } = req.body;

        if (!studentName || !studentEmail || !category ||
            !location || !title || !description) {
            if (req.file) fs.unlinkSync(req.file.path);

            return res.status(400).json({
                message: "Please fill in all required fields."
            });
        }

        const email = studentEmail.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            if (req.file) fs.unlinkSync(req.file.path);

            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        if (
            studentName.length > 100 ||
            email.length > 150 ||
            title.length > 150 ||
            location.length > 150 ||
            description.length > 5000
        ) {
            if (req.file) fs.unlinkSync(req.file.path);

            return res.status(400).json({
                message: "One or more fields exceed the allowed length."
            });
        }

        const photo = req.file ? req.file.filename : null;

        const [result] = await db.execute(
            `INSERT INTO complaints
            (student_name, student_email, category, location,
             title, description, photo)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                studentName.trim(),
                email,
                category,
                location.trim(),
                title.trim(),
                description.trim(),
                photo
            ]
        );

        const complaintCode =
            "CMP-" + String(result.insertId).padStart(6, "0");

        await db.execute(
            "UPDATE complaints SET complaint_code = ? WHERE id = ?",
            [complaintCode, result.insertId]
        );

        res.status(201).json({
            message: "Complaint submitted successfully!",
            complaintCode
        });

    } catch (error) {
        console.error("Submission error:", error);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            message: "Unable to submit complaint. Please try again."
        });
    }
});

// Track a complaint using complaint ID and student email
app.post("/api/complaints/track", async (req, res) => {
    try {
        const { complaintCode, studentEmail } = req.body;

        if (!complaintCode || !studentEmail) {
            return res.status(400).json({
                message: "Complaint ID and email are required."
            });
        }

        const [rows] = await db.execute(
            `SELECT complaint_code, category, location, title,
                    description, photo, status, created_at, updated_at
             FROM complaints
             WHERE complaint_code = ? AND student_email = ?`,
            [
                complaintCode.trim().toUpperCase(),
                studentEmail.trim().toLowerCase()
            ]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "No matching complaint found. Check your ID and email."
            });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error("Tracking error:", error);
        res.status(500).json({ message: "Unable to track complaint." });
    }
});

// Admin login
app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;

    if (!process.env.ADMIN_PASSWORD) {
        return res.status(500).json({
            message: "Admin password is not configured."
        });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({
            message: "Incorrect administrator password."
        });
    }

    req.session.isAdmin = true;

    res.json({ message: "Administrator login successful." });
});

// Check admin session
app.get("/api/admin/me", (req, res) => {
    res.json({ loggedIn: !!(req.session && req.session.isAdmin) });
});

// Admin dashboard: get all complaints
app.get("/api/admin/complaints", requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT complaint_code, student_name, student_email,
                    category, location, title, description, photo,
                    status, created_at, updated_at
             FROM complaints
             ORDER BY created_at DESC`
        );

        res.json(rows);

    } catch (error) {
        console.error("Admin list error:", error);
        res.status(500).json({ message: "Unable to load complaints." });
    }
});

// Admin dashboard statistics
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT
                COUNT(*) AS total,
                SUM(status = 'Pending') AS pending,
                SUM(status = 'In Progress') AS inProgress,
                SUM(status = 'Resolved') AS resolved
             FROM complaints`
        );

        res.json(rows[0]);

    } catch (error) {
        res.status(500).json({ message: "Unable to load statistics." });
    }
});

// Admin updates complaint status
app.patch(
    "/api/admin/complaints/:code/status",
    requireAdmin,
    async (req, res) => {
        try {
            const { status } = req.body;
            const allowed = ["Pending", "In Progress", "Resolved"];

            if (!allowed.includes(status)) {
                return res.status(400).json({
                    message: "Invalid complaint status."
                });
            }

            const [result] = await db.execute(
                `UPDATE complaints
                 SET status = ?
                 WHERE complaint_code = ?`,
                [status, req.params.code]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Complaint not found."
                });
            }

            res.json({ message: "Complaint status updated successfully." });

        } catch (error) {
            console.error("Status update error:", error);
            res.status(500).json({
                message: "Unable to update complaint status."
            });
        }
    }
);

// Admin logout
app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("campuscare.sid");
        res.json({ message: "Logged out successfully." });
    });
});

// Handle invalid routes
app.use((req, res) => {
    res.status(404).json({ message: "Requested resource not found." });
});

// General error handler
app.use((err, req, res, next) => {
    console.error(err);

    if (res.headersSent) return next(err);

    res.status(500).json({ message: "An unexpected server error occurred." });
});

async function startServer() {
    try {
        await db.query("SELECT 1");

        app.listen(PORT, () => {
            console.log(`CampusCare running at http://localhost:${PORT}`);
            console.log("Connected to MySQL database!");
        });
    } catch (error) {
        console.error("Database connection failed:", error.message);
        process.exit(1);
    }
}

startServer();
