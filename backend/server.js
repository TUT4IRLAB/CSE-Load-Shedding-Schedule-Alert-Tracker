
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("ERROR: JWT_SECRET is missing from backend/.env");
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "load_shedding_tracker",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

const COOKIE_NAME = "token";
const SIMULATED_SOURCE = "SIMULATED TEST DATA - NOT REAL";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 24 * 60 * 60 * 1000,
};

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, cookieOptions);
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

const adminEmails = new Set(
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

async function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";

    const bearerToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

    const token = req.cookies[COOKIE_NAME] || bearerToken;

    if (!token) {
      return res.status(401).json({
        message: "Please log in to continue.",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      clearAuthCookie(res);

      return res.status(401).json({
        message: "Your session has expired. Please log in again.",
      });
    }

    const result = await pool.query(
      `SELECT id, full_name, email, area_id
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      clearAuthCookie(res);

      return res.status(401).json({
        message: "Your account could not be found. Please log in again.",
      });
    }

    req.user = result.rows[0];
    return next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(500).json({
      message: "Could not verify your session.",
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: "Please log in to continue.",
    });
  }

  if (!adminEmails.has(req.user.email.toLowerCase())) {
    return res.status(403).json({
      message: "Administrator access is required.",
    });
  }

  return next();
}

function validId(value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return false;
  }

  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0;
}

function validStage(value) {
  const stage = Number(value);

  return (
    value !== null &&
    value !== undefined &&
    String(value).trim() !== "" &&
    Number.isInteger(stage) &&
    stage >= 1 &&
    stage <= 8
  );
}

function validDateRange(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  return (
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    end.getTime() > start.getTime()
  );
}

// --------------------------------------------------
// GENERAL / HEALTH
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    message: "PowerTrack SA API is running.",
    status: "ok",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "PowerTrack SA backend is running.",
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS database_time");

    return res.json({
      status: "ok",
      message: "PostgreSQL connection successful.",
      database_time: result.rows[0].database_time,
    });
  } catch (error) {
    console.error("Database test failed:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Could not connect to PostgreSQL.",
    });
  }
});

// --------------------------------------------------
// REGISTER
// --------------------------------------------------

app.post("/api/auth/register", async (req, res) => {
  try {
    const { full_name, email, password, area_id } = req.body;

    if (
      typeof full_name !== "string" ||
      !full_name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Please enter your name, email and password.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = full_name.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    let selectedAreaId = null;

    if (area_id !== undefined && area_id !== null && area_id !== "") {
      if (!validId(area_id)) {
        return res.status(400).json({
          message: "Please select a valid area.",
        });
      }

      selectedAreaId = Number(area_id);

      const areaResult = await pool.query(
        "SELECT id FROM areas WHERE id = $1",
        [selectedAreaId]
      );

      if (areaResult.rows.length === 0) {
        return res.status(400).json({
          message: "The selected area does not exist.",
        });
      }
    }

    const existingUser = await pool.query(
      `SELECT id FROM users WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, area_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, area_id`,
      [normalizedName, normalizedEmail, passwordHash, selectedAreaId]
    );

    const newUser = result.rows[0];

    setAuthCookie(res, createToken(newUser));

    return res.status(201).json({
      message: "Account created successfully.",
      user: newUser,
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    return res.status(500).json({
      message: "Could not create your account. Please try again.",
    });
  }
});

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Please enter your email and password.",
      });
    }

    const result = await pool.query(
      `SELECT id, full_name, email, password_hash, area_id
       FROM users
       WHERE LOWER(email) = $1`,
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    setAuthCookie(res, createToken(user));

    return res.json({
      message: "Login successful.",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        area_id: user.area_id,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Could not log in. Please try again.",
    });
  }
});

// --------------------------------------------------
// CURRENT USER
// --------------------------------------------------

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         u.area_id,
         a.name AS area_name
       FROM users u
       LEFT JOIN areas a ON a.id = u.area_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const user = result.rows[0];

    return res.json({
      user: {
        ...user,
        is_admin: adminEmails.has(user.email.toLowerCase()),
      },
    });
  } catch (error) {
    console.error("Current-user error:", error);

    return res.status(500).json({
      message: "Could not load your account.",
    });
  }
});

// --------------------------------------------------
// CHANGE PREFERRED AREA
// --------------------------------------------------

app.put("/api/auth/preferred-area", requireAuth, async (req, res) => {
  try {
    const { area_id } = req.body;

    let selectedAreaId = null;

    if (area_id !== undefined && area_id !== null && area_id !== "") {
      if (!validId(area_id)) {
        return res.status(400).json({
          message: "Please select a valid area.",
        });
      }

      selectedAreaId = Number(area_id);

      const areaResult = await pool.query(
        "SELECT id FROM areas WHERE id = $1",
        [selectedAreaId]
      );

      if (areaResult.rows.length === 0) {
        return res.status(400).json({
          message: "The selected area does not exist.",
        });
      }
    }

    const result = await pool.query(
      `UPDATE users
       SET area_id = $1
       WHERE id = $2
       RETURNING id, full_name, email, area_id`,
      [selectedAreaId, req.user.id]
    );

    return res.json({
      message: "Preferred area updated successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Preferred-area error:", error);

    return res.status(500).json({
      message: "Could not update your preferred area.",
    });
  }
});

// --------------------------------------------------
// LOGOUT
// --------------------------------------------------

app.post("/api/auth/logout", (req, res) => {
  clearAuthCookie(res);

  return res.json({
    message: "Logged out successfully.",
  });
});

// --------------------------------------------------
// PUBLIC AREA LIST
// --------------------------------------------------

app.get("/api/areas", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, esp_area_id
       FROM areas
       ORDER BY name ASC`
    );

    // This endpoint returns an array directly.
    return res.json(result.rows);
  } catch (error) {
    console.error("Get areas error:", error);

    return res.status(500).json({
      message: "Could not load areas.",
    });
  }
});

// --------------------------------------------------
// ADMIN: CREATE AREA
// Frontend: POST /api/admin/areas
// --------------------------------------------------

app.post("/api/admin/areas", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, esp_area_id } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Area name is required.",
      });
    }

    const result = await pool.query(
      `INSERT INTO areas (name, esp_area_id)
       VALUES ($1, $2)
       RETURNING id, name, esp_area_id`,
      [
        name.trim(),
        typeof esp_area_id === "string" && esp_area_id.trim()
          ? esp_area_id.trim()
          : null,
      ]
    );

    return res.status(201).json({
      message: "Area created successfully.",
      area: result.rows[0],
    });
  } catch (error) {
    console.error("Create area error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "An area with these details already exists.",
      });
    }

    return res.status(500).json({
      message: "Could not create area.",
    });
  }
});

// --------------------------------------------------
// ADMIN: UPDATE AREA
// Frontend: PUT /api/admin/areas/:id
// --------------------------------------------------

app.put(
  "/api/admin/areas/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, esp_area_id } = req.body;

      if (!validId(id)) {
        return res.status(400).json({
          message: "Invalid area ID.",
        });
      }

      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Area name is required.",
        });
      }

      const result = await pool.query(
        `UPDATE areas
         SET name = $1, esp_area_id = $2
         WHERE id = $3
         RETURNING id, name, esp_area_id`,
        [
          name.trim(),
          typeof esp_area_id === "string" && esp_area_id.trim()
            ? esp_area_id.trim()
            : null,
          Number(id),
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Area not found.",
        });
      }

      return res.json({
        message: "Area updated successfully.",
        area: result.rows[0],
      });
    } catch (error) {
      console.error("Update area error:", error);

      if (error.code === "23505") {
        return res.status(409).json({
          message: "An area with these details already exists.",
        });
      }

      return res.status(500).json({
        message: "Could not update area.",
      });
    }
  }
);

// --------------------------------------------------
// ADMIN: DELETE AREA
// Protects real schedules from accidental deletion.
// Frontend: DELETE /api/admin/areas/:id
// --------------------------------------------------

app.delete(
  "/api/admin/areas/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;

      if (!validId(id)) {
        return res.status(400).json({
          message: "Invalid area ID.",
        });
      }

      await client.query("BEGIN");

      const areaResult = await client.query(
        "SELECT id, name FROM areas WHERE id = $1 FOR UPDATE",
        [Number(id)]
      );

      if (areaResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "Area not found.",
        });
      }

      // Do not silently delete real or simulated schedules.
      const scheduleResult = await client.query(
        "SELECT COUNT(*)::int AS count FROM schedules WHERE area_id = $1",
        [Number(id)]
      );

      if (scheduleResult.rows[0].count > 0) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          message:
            "This area has schedules. Remove or reassign its schedules before deleting the area.",
        });
      }

      await client.query(
        "UPDATE users SET area_id = NULL WHERE area_id = $1",
        [Number(id)]
      );

      await client.query(
        "DELETE FROM areas WHERE id = $1",
        [Number(id)]
      );

      await client.query("COMMIT");

      return res.json({
        message: "Area deleted successfully.",
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});

      console.error("Delete area error:", error);

      return res.status(500).json({
        message: "Could not delete area.",
      });
    } finally {
      client.release();
    }
  }
);

// --------------------------------------------------
// PUBLIC SCHEDULES
// --------------------------------------------------

app.get("/api/schedules", async (req, res) => {
  try {
    const selectedArea = req.query.area_id || req.query.area;

    let filter = "";
    const values = [];

    if (selectedArea !== undefined && selectedArea !== "") {
      if (validId(selectedArea)) {
        values.push(Number(selectedArea));
        filter = `AND a.id = $${values.length}`;
      } else if (typeof selectedArea === "string") {
        values.push(selectedArea.trim());
        filter = `AND LOWER(a.name) = LOWER($${values.length})`;
      } else {
        return res.status(400).json({
          message: "Invalid area selection.",
        });
      }
    }

    const result = await pool.query(
      `SELECT
         s.id,
         s.area_id,
         s.stage,
         s.start_time,
         s.end_time,
         s.source,
         a.name AS area_name
       FROM schedules s
       JOIN areas a ON a.id = s.area_id
       WHERE s.end_time > NOW()
       ${filter}
       ORDER BY s.start_time ASC`,
      values
    );

    return res.json({
      message: "Schedules loaded successfully.",
      schedules: result.rows,
    });
  } catch (error) {
    console.error("Get schedules error:", error);

    return res.status(500).json({
      message: "Could not load schedules.",
    });
  }
});

// --------------------------------------------------
// ADMIN: LIST SCHEDULES
// --------------------------------------------------

app.get(
  "/api/admin/schedules",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           s.id,
           s.area_id,
           s.stage,
           s.start_time,
           s.end_time,
           s.source,
           a.name AS area_name
         FROM schedules s
         JOIN areas a ON a.id = s.area_id
         ORDER BY s.start_time DESC`
      );

      return res.json({
        schedules: result.rows,
      });
    } catch (error) {
      console.error("Admin list schedules error:", error);

      return res.status(500).json({
        message: "Could not load schedules.",
      });
    }
  }
);

// --------------------------------------------------
// ADMIN: CREATE SCHEDULE
// --------------------------------------------------

app.post(
  "/api/admin/schedules",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { area_id, stage, start_time, end_time, source } = req.body;

      if (!validId(area_id)) {
        return res.status(400).json({
          message: "Please select a valid area.",
        });
      }

      if (!validStage(stage)) {
        return res.status(400).json({
          message: "Stage must be a number from 1 to 8.",
        });
      }

      if (!validDateRange(start_time, end_time)) {
        return res.status(400).json({
          message: "Please provide a valid start and end time.",
        });
      }

      const areaResult = await pool.query(
        "SELECT id FROM areas WHERE id = $1",
        [Number(area_id)]
      );

      if (areaResult.rows.length === 0) {
        return res.status(400).json({
          message: "The selected area does not exist.",
        });
      }

      const result = await pool.query(
        `INSERT INTO schedules
           (area_id, stage, start_time, end_time, source)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, area_id, stage, start_time, end_time, source`,
        [
          Number(area_id),
          Number(stage),
          new Date(start_time).toISOString(),
          new Date(end_time).toISOString(),
          typeof source === "string" && source.trim()
            ? source.trim()
            : "MANUALLY ENTERED",
        ]
      );

      return res.status(201).json({
        message: "Schedule created successfully.",
        schedule: result.rows[0],
      });
    } catch (error) {
      console.error("Create schedule error:", error);

      return res.status(500).json({
        message: "Could not create schedule.",
      });
    }
  }
);

// --------------------------------------------------
// ADMIN: UPDATE SCHEDULE
// --------------------------------------------------

app.put(
  "/api/admin/schedules/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { area_id, stage, start_time, end_time, source } = req.body;

      if (!validId(id) || !validId(area_id)) {
        return res.status(400).json({
          message: "Invalid schedule or area ID.",
        });
      }

      if (!validStage(stage)) {
        return res.status(400).json({
          message: "Stage must be a number from 1 to 8.",
        });
      }

      if (!validDateRange(start_time, end_time)) {
        return res.status(400).json({
          message: "Please provide a valid start and end time.",
        });
      }

      const areaResult = await pool.query(
        "SELECT id FROM areas WHERE id = $1",
        [Number(area_id)]
      );

      if (areaResult.rows.length === 0) {
        return res.status(400).json({
          message: "The selected area does not exist.",
        });
      }

      const result = await pool.query(
        `UPDATE schedules
         SET area_id = $1,
             stage = $2,
             start_time = $3,
             end_time = $4,
             source = $5
         WHERE id = $6
         RETURNING id, area_id, stage, start_time, end_time, source`,
        [
          Number(area_id),
          Number(stage),
          new Date(start_time).toISOString(),
          new Date(end_time).toISOString(),
          typeof source === "string" && source.trim()
            ? source.trim()
            : "MANUALLY ENTERED",
          Number(id),
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Schedule not found.",
        });
      }

      return res.json({
        message: "Schedule updated successfully.",
        schedule: result.rows[0],
      });
    } catch (error) {
      console.error("Update schedule error:", error);

      return res.status(500).json({
        message: "Could not update schedule.",
      });
    }
  }
);

// --------------------------------------------------
// ADMIN: DELETE SCHEDULE
// --------------------------------------------------

app.delete(
  "/api/admin/schedules/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!validId(id)) {
        return res.status(400).json({
          message: "Invalid schedule ID.",
        });
      }

      const result = await pool.query(
        "DELETE FROM schedules WHERE id = $1 RETURNING id",
        [Number(id)]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Schedule not found.",
        });
      }

      return res.json({
        message: "Schedule deleted successfully.",
      });
    } catch (error) {
      console.error("Delete schedule error:", error);

      return res.status(500).json({
        message: "Could not delete schedule.",
      });
    }
  }
);

// --------------------------------------------------
// ADMIN: GENERATE SIMULATED TEST SCHEDULES
// Seven days, all areas.
// Test data only. Never presented as a real forecast.
// --------------------------------------------------

app.post(
  "/api/admin/schedules/generate-test",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const areaResult = await client.query(
        "SELECT id, name FROM areas ORDER BY id"
      );

      if (areaResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "There are no areas. Add areas before generating test data.",
        });
      }

      // Only replace records carrying the exact simulated-test label.
      // Real or manually entered schedule sources are preserved.
      await client.query(
        "DELETE FROM schedules WHERE source = $1",
        [SIMULATED_SOURCE]
      );

      const generatedSchedules = [];
      let noOutageAreaDays = 0;
      let outageAreaDays = 0;

      const firstDay = new Date();
      firstDay.setUTCHours(0, 0, 0, 0);
      firstDay.setUTCDate(firstDay.getUTCDate() + 1);

      for (const area of areaResult.rows) {
        for (let day = 0; day < 7; day++) {
          // Random test scenario; not a real prediction.
          const hasSimulatedOutage = Math.random() < 0.35;

          if (!hasSimulatedOutage) {
            noOutageAreaDays++;
            continue;
          }

          outageAreaDays++;

          // One or two simulated events on an outage day.
          const eventCount = Math.random() < 0.7 ? 1 : 2;

          for (let event = 0; event < eventCount; event++) {
            const start = new Date(firstDay);

            start.setUTCDate(start.getUTCDate() + day);

            // Random start between 06:00 and 20:00 UTC.
            start.setUTCHours(
              6 + Math.floor(Math.random() * 15),
              0,
              0,
              0
            );

            // Each simulated event lasts two hours.
            const end = new Date(start);
            end.setUTCHours(end.getUTCHours() + 2);

            const stage = 1 + Math.floor(Math.random() * 8);

            const inserted = await client.query(
              `INSERT INTO schedules
                 (area_id, stage, start_time, end_time, source)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING
                 id, area_id, stage, start_time, end_time, source`,
              [
                area.id,
                stage,
                start.toISOString(),
                end.toISOString(),
                SIMULATED_SOURCE,
              ]
            );

            generatedSchedules.push({
              ...inserted.rows[0],
              area_name: area.name,
            });
          }
        }
      }

      await client.query("COMMIT");

      const areaDaysChecked = areaResult.rows.length * 7;

      return res.json({
        success: true,
        message:
          "Simulated test schedules generated. These are NOT real outage information.",
        simulated: true,
        source: SIMULATED_SOURCE,
        areasProcessed: areaResult.rows.length,
        simulatedDaysPerArea: 7,
        areaDaysChecked,
        noOutageAreaDays,
        outageAreaDays,
        schedulesGenerated: generatedSchedules.length,
        schedules: generatedSchedules,
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});

      console.error("Generate test schedules error:", error);

      return res.status(500).json({
        success: false,
        message: "Could not generate simulated test schedules.",
      });
    } finally {
      client.release();
    }
  }
);

// --------------------------------------------------
// API NOT FOUND
// --------------------------------------------------

app.use((req, res) => {
  return res.status(404).json({
    message: "API route not found.",
    path: req.path,
    method: req.method,
  });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

async function startServer() {
  try {
    await pool.query("SELECT 1");

    console.log("PostgreSQL connection successful.");

    app.listen(PORT, () => {
      console.log(`PowerTrack SA API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Could not connect to PostgreSQL:", error.message);
    process.exit(1);
  }
}

startServer();
