
const $ = (id) => document.getElementById(id);

// Navigation
function showView(viewName) {
    document.querySelectorAll(".view").forEach(view => {
        view.classList.remove("active-view");
    });

    document.querySelectorAll(".nav-link").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === viewName
        );
    });

    $(viewName).classList.add("active-view");

    if (viewName === "admin") {
        checkAdminSession();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
        showView(button.dataset.view);
    });
});

// API helper
async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: "same-origin",
        ...options
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = "message " + type;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatDate(value) {
    return new Date(value).toLocaleString();
}

function statusClass(status) {
    if (status === "Resolved") return "resolved";
    if (status === "In Progress") return "in-progress";
    return "";
}

// Photo preview
$("photo").addEventListener("change", () => {
    const file = $("photo").files[0];
    const preview = $("photoPreview");

    if (!file) {
        preview.classList.add("hidden");
        preview.removeAttribute("src");
        return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
        alert("Choose a JPG, PNG or WEBP image smaller than 5 MB.");
        $("photo").value = "";
        preview.classList.add("hidden");
        return;
    }

    preview.src = URL.createObjectURL(file);
    preview.classList.remove("hidden");
});

// Submit complaint
$("complaintForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = $("submitMessage");
    const button = event.target.querySelector('button[type="submit"]');

    button.disabled = true;
    button.textContent = "Submitting...";

    try {
        const formData = new FormData(event.target);

        const data = await apiRequest("/api/complaints", {
            method: "POST",
            body: formData
        });

        showMessage(
            message,
            `${data.message} Your complaint ID is ${data.complaintCode}. Please save it.`,
            "success"
        );

        event.target.reset();
        $("photoPreview").classList.add("hidden");
        $("photoPreview").removeAttribute("src");

    } catch (error) {
        showMessage(message, error.message, "error");

    } finally {
        button.disabled = false;
        button.textContent = "Submit Complaint →";
    }
});

// Track complaint
$("trackForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = $("trackMessage");
    const result = $("trackResult");

    result.classList.add("hidden");

    try {
        const data = await apiRequest("/api/complaints/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                complaintCode: $("trackCode").value,
                studentEmail: $("trackEmail").value
            })
        });

        showMessage(message, "Complaint found successfully.", "success");

        const photo = data.photo
            ? `<img class="result-photo" src="/uploads/${encodeURIComponent(data.photo)}" alt="Complaint photograph">`
            : "";

        result.innerHTML = `
            <span class="eyebrow">COMPLAINT DETAILS</span>
            <h2>${escapeHTML(data.title)}</h2>
            <p><strong>${escapeHTML(data.complaint_code)}</strong></p>
            <p style="margin-top:12px">
                <span class="status ${statusClass(data.status)}">
                    ${escapeHTML(data.status)}
                </span>
            </p>

            <div class="result-details">
                <div class="detail">
                    <span>Category</span>
                    <strong>${escapeHTML(data.category)}</strong>
                </div>
                <div class="detail">
                    <span>Location</span>
                    <strong>${escapeHTML(data.location)}</strong>
                </div>
                <div class="detail">
                    <span>Submitted</span>
                    <strong>${formatDate(data.created_at)}</strong>
                </div>
                <div class="detail">
                    <span>Last Updated</span>
                    <strong>${formatDate(data.updated_at)}</strong>
                </div>
            </div>

            <div style="margin-top:18px">
                <strong>Description</strong>
                <p>${escapeHTML(data.description)}</p>
            </div>
            ${photo}
        `;

        result.classList.remove("hidden");

    } catch (error) {
        showMessage(message, error.message, "error");
    }
});

// Check admin login session
async function checkAdminSession() {
    try {
        const data = await apiRequest("/api/admin/me");

        if (data.loggedIn) {
            $("adminLoginForm").classList.add("hidden");
            $("adminDashboard").classList.remove("hidden");
            loadAdminDashboard();
        } else {
            $("adminLoginForm").classList.remove("hidden");
            $("adminDashboard").classList.add("hidden");
        }
    } catch (error) {
        $("adminLoginForm").classList.remove("hidden");
        $("adminDashboard").classList.add("hidden");
    }
}

// Admin login
$("adminLoginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = $("adminMessage");
    const button = event.target.querySelector('button[type="submit"]');

    button.disabled = true;

    try {
        await apiRequest("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                password: $("adminPassword").value
            })
        });

        $("adminPassword").value = "";
        showMessage(message, "Login successful!", "success");

        $("adminLoginForm").classList.add("hidden");
        $("adminDashboard").classList.remove("hidden");

        loadAdminDashboard();

    } catch (error) {
        showMessage(message, error.message, "error");

    } finally {
        button.disabled = false;
    }
});

// Load statistics and complaints
async function loadAdminDashboard() {
    try {
        const [stats, complaints] = await Promise.all([
            apiRequest("/api/admin/stats"),
            apiRequest("/api/admin/complaints")
        ]);

        $("totalCount").textContent = stats.total || 0;
        $("pendingCount").textContent = stats.pending || 0;
        $("progressCount").textContent = stats.inProgress || 0;
        $("resolvedCount").textContent = stats.resolved || 0;

        renderComplaints(complaints);

        $("adminMessageList").textContent =
            complaints.length === 0
                ? "No complaints have been submitted yet."
                : `${complaints.length} complaint(s) found.`;

    } catch (error) {
        $("adminMessageList").textContent = error.message;

        if (error.message.includes("Administrator login")) {
            $("adminDashboard").classList.add("hidden");
            $("adminLoginForm").classList.remove("hidden");
        }
    }
}

// Display complaints in admin table
function renderComplaints(complaints) {
    const table = $("complaintsTable");

    if (complaints.length === 0) {
        table.innerHTML = `
            <tr><td colspan="6">No complaints available.</td></tr>
        `;
        return;
    }

    table.innerHTML = complaints.map(complaint => {
        const photo = complaint.photo
            ? `<a href="/uploads/${encodeURIComponent(complaint.photo)}" target="_blank" rel="noopener">View Photo</a>`
            : "No photo";

        return `
            <tr>
                <td>
                    <strong>${escapeHTML(complaint.complaint_code)}</strong>
                    <br><small>${escapeHTML(complaint.title)}</small>
                </td>
                <td>
                    ${escapeHTML(complaint.student_name)}
                    <br><small>${escapeHTML(complaint.student_email)}</small>
                </td>
                <td>${escapeHTML(complaint.category)}</td>
                <td>${escapeHTML(complaint.location)}</td>
                <td>${photo}</td>
                <td>
                    <select class="status-select"
                        data-code="${escapeHTML(complaint.complaint_code)}">
                        <option value="Pending"
                            ${complaint.status === "Pending" ? "selected" : ""}>
                            Pending
                        </option>
                        <option value="In Progress"
                            ${complaint.status === "In Progress" ? "selected" : ""}>
                            In Progress
                        </option>
                        <option value="Resolved"
                            ${complaint.status === "Resolved" ? "selected" : ""}>
                            Resolved
                        </option>
                    </select>
                </td>
            </tr>
        `;
    }).join("");
}

// Update complaint status
$("complaintsTable").addEventListener("change", async (event) => {
    if (!event.target.matches(".status-select")) return;

    const select = event.target;
    const code = select.dataset.code;
    const newStatus = select.value;

    select.disabled = true;

    try {
        await apiRequest(
            `/api/admin/complaints/${encodeURIComponent(code)}/status`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            }
        );

        $("adminMessageList").textContent =
            `Status updated for ${code}.`;

        await loadAdminDashboard();

    } catch (error) {
        $("adminMessageList").textContent = error.message;
        await loadAdminDashboard();

    } finally {
        select.disabled = false;
    }
});

// Refresh dashboard
$("refreshBtn").addEventListener("click", loadAdminDashboard);

// Admin logout
$("logoutBtn").addEventListener("click", async () => {
    try {
        await apiRequest("/api/admin/logout", {
            method: "POST"
        });

        $("adminDashboard").classList.add("hidden");
        $("adminLoginForm").classList.remove("hidden");
        showMessage($("adminMessage"), "Logged out successfully.", "success");

    } catch (error) {
        alert(error.message);
    }
});

// Initial health check
apiRequest("/api/health")
    .then(data => console.log(data.message))
    .catch(error => console.error(error.message));
