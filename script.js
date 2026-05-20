const GRADE_POINTS = {
  A: 4.0,
  "B+": 3.5,
  B: 3.0,
  "C+": 2.5,
  C: 2.0,
  D: 1.5,
  F: 0.0,
};

const HISTORY_STORAGE_KEY = "neon-gpa-history";
const THEME_STORAGE_KEY = "neon-gpa-theme";
const DEFAULT_COURSE_ROW_COUNT = 3;

const elements = {};
let historyEntries = [];

function cacheElements() {
  elements.body = document.body;
  elements.themeToggle = document.getElementById("themeToggle");
  elements.addCourseBtn = document.getElementById("addCourseBtn");
  elements.resetBtn = document.getElementById("resetBtn");
  elements.clearHistoryBtn = document.getElementById("clearHistoryBtn");
  elements.loadDemoBtn = document.getElementById("loadDemoBtn");
  elements.gpaForm = document.getElementById("gpaForm");
  elements.courseTableBody = document.getElementById("courseTableBody");
  elements.resultCard = document.getElementById("resultCard");
  elements.resultStudentSummary = document.getElementById("resultStudentSummary");
  elements.gpaValue = document.getElementById("gpaValue");
  elements.gpaClassification = document.getElementById("gpaClassification");
  elements.totalCredits = document.getElementById("totalCredits");
  elements.totalGradePoints = document.getElementById("totalGradePoints");
  elements.totalCourses = document.getElementById("totalCourses");
  elements.gpaProgressBar = document.getElementById("gpaProgressBar");
  elements.gpaProgressText = document.getElementById("gpaProgressText");
  elements.progressLabel = document.getElementById("progressLabel");
  elements.validationNote = document.getElementById("validationNote");
  elements.historyList = document.getElementById("historyList");
  elements.historyCount = document.getElementById("historyCount");
    elements.clearHistoryPanelBtn = document.getElementById("clearHistoryPanelBtn");
    elements.quickCourseCount = document.getElementById("quickCourseCount");
  elements.quickCreditCount = document.getElementById("quickCreditCount");
  elements.quickGpaValue = document.getElementById("quickGpaValue");
  elements.heroGpa = document.getElementById("heroGpa");
  elements.toastContainer = document.getElementById("toastContainer");
  elements.particleField = document.getElementById("particleField");
  elements.studentName = document.getElementById("studentName");
  elements.studentId = document.getElementById("studentId");
  elements.studentProgram = document.getElementById("studentProgram");
  elements.academicLevel = document.getElementById("academicLevel");
  elements.semester = document.getElementById("semester");
  elements.currentYear = document.getElementById("currentYear");
}

function getStudentInfo() {
  return {
    name: elements.studentName.value.trim(),
    studentId: elements.studentId.value.trim(),
    program: elements.studentProgram.value.trim(),
    level: elements.academicLevel.value.trim(),
    semester: elements.semester.value,
  };
}

function setStudentInfo(studentInfo = {}) {
  elements.studentName.value = studentInfo.name || "";
  elements.studentId.value = studentInfo.studentId || "";
  elements.studentProgram.value = studentInfo.program || "";
  elements.academicLevel.value = studentInfo.level || "";
  elements.semester.value = studentInfo.semester || "First Semester";
}

function validateStudentInfo() {
  const studentInfo = getStudentInfo();
  let isValid = true;

  if (!studentInfo.name) {
    markInvalid(elements.studentName);
    isValid = false;
  }

  return { isValid, studentInfo };
}

function createCourseRow(course = {}) {
  const row = document.createElement("tr");
  row.className = "course-row";

  row.innerHTML = `
    <td>
      <input class="course-input" type="text" name="courseName" placeholder="e.g. ICT 201" value="${escapeAttribute(course.name || "")}" maxlength="80" aria-label="Course name">
    </td>
    <td>
      <input class="credit-input" type="number" name="creditHours" min="0" step="1" placeholder="3" value="${escapeAttribute(course.credits ?? "")}" aria-label="Credit hours">
    </td>
    <td>
      <select class="grade-select" name="grade" aria-label="Grade">
        ${buildGradeOptions(course.grade || "")}
      </select>
    </td>
    <td><span class="course-points" data-course-points>0.00</span></td>
    <td>
      <button class="remove-course-button" type="button" aria-label="Remove course">×</button>
    </td>
  `;

  wireRowEvents(row);
  updateRowPoints(row);
  return row;
}

function buildGradeOptions(selectedGrade) {
  return Object.keys(GRADE_POINTS)
    .map((grade) => {
      const selected = grade === selectedGrade ? "selected" : "";
      return `<option value="${grade}" ${selected}>${grade} (${GRADE_POINTS[grade].toFixed(1)})</option>`;
    })
    .join("");
}

function wireRowEvents(row) {
  const removeButton = row.querySelector(".remove-course-button");
  const creditInput = row.querySelector("[name='creditHours']");
  const gradeSelect = row.querySelector("[name='grade']");
  const courseInput = row.querySelector("[name='courseName']");

  removeButton.addEventListener("click", () => {
    if (elements.courseTableBody.children.length <= 1) {
      showToast("Keep at least one course row.", "info");
      return;
    }

    row.remove();
    refreshAllPoints();
    showToast("Course removed.", "info");
  });

  [creditInput, gradeSelect, courseInput].forEach((field) => {
    field.addEventListener("input", () => {
      clearValidation(field);
      updateRowPoints(row);
    });
    field.addEventListener("change", () => updateRowPoints(row));
  });
}

function updateRowPoints(row) {
  const creditInput = row.querySelector("[name='creditHours']");
  const gradeSelect = row.querySelector("[name='grade']");
  const pointsTarget = row.querySelector("[data-course-points]");

  const creditHours = Number.parseFloat(creditInput.value);
  const gradePoints = GRADE_POINTS[gradeSelect.value] ?? 0;
  const coursePoints = Number.isFinite(creditHours) ? creditHours * gradePoints : 0;

  pointsTarget.textContent = coursePoints.toFixed(2);
}

function refreshAllPoints() {
  elements.courseTableBody.querySelectorAll(".course-row").forEach((row) => updateRowPoints(row));
}

function collectCourseRows() {
  return [...elements.courseTableBody.querySelectorAll(".course-row")].map((row) => ({
    row,
    courseName: row.querySelector("[name='courseName']"),
    creditHours: row.querySelector("[name='creditHours']"),
    grade: row.querySelector("[name='grade']"),
  }));
}

function validateCourseRow(rowFields) {
  let isValid = true;
  const courseNameValue = rowFields.courseName.value.trim();
  const creditValue = Number.parseFloat(rowFields.creditHours.value);
  const gradeValue = rowFields.grade.value;

  if (!courseNameValue) {
    markInvalid(rowFields.courseName);
    isValid = false;
  }

  if (!Number.isFinite(creditValue) || creditValue <= 0) {
    markInvalid(rowFields.creditHours);
    isValid = false;
  }

  if (!GRADE_POINTS.hasOwnProperty(gradeValue)) {
    markInvalid(rowFields.grade);
    isValid = false;
  }

  return isValid;
}

function markInvalid(field) {
  field.classList.add("field-invalid");
}

function clearValidation(field) {
  field.classList.remove("field-invalid");
}

function clearAllValidation() {
  elements.gpaForm.querySelectorAll(".field-invalid").forEach((field) => field.classList.remove("field-invalid"));
}

function calculateGpa(courses) {
  const totals = courses.reduce(
    (accumulator, course) => {
      const creditHours = Number.parseFloat(course.creditHours.value);
      const gradePoints = GRADE_POINTS[course.grade.value];
      const weightedPoints = creditHours * gradePoints;

      accumulator.totalCredits += creditHours;
      accumulator.totalGradePoints += weightedPoints;
      accumulator.courseSummaries.push({
        name: course.courseName.value.trim(),
        credits: creditHours,
        grade: course.grade.value,
        gradePoints,
        weightedPoints,
      });
      return accumulator;
    },
    { totalCredits: 0, totalGradePoints: 0, courseSummaries: [] }
  );

  const gpa = totals.totalCredits > 0 ? totals.totalGradePoints / totals.totalCredits : 0;
  return { ...totals, gpa };
}

function getClassification(gpa) {
  if (gpa >= 3.6) return "First Class";
  if (gpa >= 3.0) return "Second Class Upper";
  if (gpa >= 2.0) return "Second Class Lower";
  if (gpa >= 1.0) return "Pass";
  return "Pass";
}

function getProgressLabel(gpa) {
  if (gpa >= 3.6) return "Outstanding";
  if (gpa >= 3.0) return "Strong performance";
  if (gpa >= 2.0) return "Steady progress";
  if (gpa >= 1.0) return "Keep improving";
  return "Build momentum";
}

function animateStudentSummary() {
  elements.resultStudentSummary.classList.remove("reveal-student");
  // Force reflow so repeated calculations still replay the animation.
  void elements.resultStudentSummary.offsetWidth;
  elements.resultStudentSummary.classList.add("reveal-student");
}

function updateResultPanel(summary, studentInfo = null) {
  const roundedGpa = summary.gpa.toFixed(2);
  const progressPercent = Math.min((summary.gpa / 4) * 100, 100);
  const activeStudent = studentInfo || { name: "Student" };

  elements.gpaValue.textContent = roundedGpa;
  elements.gpaClassification.textContent = getClassification(summary.gpa);
  elements.totalCredits.textContent = summary.totalCredits.toFixed(0);
  elements.totalGradePoints.textContent = summary.totalGradePoints.toFixed(2);
  elements.totalCourses.textContent = summary.courseSummaries.length.toString();
  elements.gpaProgressBar.style.width = `${progressPercent}%`;
  elements.gpaProgressText.textContent = `${progressPercent.toFixed(0)}%`;
  elements.progressLabel.textContent = getProgressLabel(summary.gpa);
  elements.validationNote.textContent = `Calculated from ${summary.courseSummaries.length} course${summary.courseSummaries.length === 1 ? "" : "s"}.`;

  elements.quickCourseCount.textContent = summary.courseSummaries.length.toString();
  elements.quickCreditCount.textContent = summary.totalCredits.toFixed(0);
  elements.quickGpaValue.textContent = roundedGpa;
  elements.heroGpa.textContent = roundedGpa;
  elements.resultStudentSummary.textContent = `Performance Summary for ${activeStudent.name || "Student"}`;
  animateStudentSummary();

  elements.resultCard.animate(
    [
      { transform: "translateY(0) scale(1)" },
      { transform: "translateY(-4px) scale(1.01)" },
      { transform: "translateY(0) scale(1)" },
    ],
    { duration: 420, easing: "ease-out" }
  );
}

function saveHistoryEntry(summary) {
  const studentInfo = getStudentInfo();
  const entry = {
    id: cryptoRandomId(),
    timestamp: new Date().toISOString(),
    gpa: Number(summary.gpa.toFixed(2)),
    totalCredits: Number(summary.totalCredits.toFixed(0)),
    totalGradePoints: Number(summary.totalGradePoints.toFixed(2)),
    classification: getClassification(summary.gpa),
    courses: summary.courseSummaries,
    studentInfo,
  };

  historyEntries = [entry, ...historyEntries].slice(0, 8);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyEntries));
  renderHistory();
  return entry;
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  elements.historyCount.textContent = `${historyEntries.length} saved`;

  if (historyEntries.length === 0) {
    elements.historyList.innerHTML = '<div class="history-item"><p class="history-meta">No stored calculations yet. Run a GPA calculation to create your first entry.</p></div>';
    return;
  }

  historyEntries.forEach((entry) => {
    const historyItem = document.createElement("article");
    historyItem.className = "history-item";

    historyItem.innerHTML = `
      <div class="history-top">
        <div>
          <div class="history-gpa">${entry.gpa.toFixed(2)} GPA</div>
          <div class="history-meta">
            <span>${formatTimestamp(entry.timestamp)}</span>
            <span>${escapeHtml(entry.studentInfo?.name || "Student")}</span>
            <span>${entry.classification}</span>
            <span>${entry.totalCredits} credits</span>
          </div>
        </div>
        <span class="classification-badge">${entry.classification}</span>
      </div>
      <div class="history-meta">
        ${entry.courses.map((course) => `<span>${escapeHtml(course.name)} • ${course.credits} cr • ${course.grade}</span>`).join("")}
      </div>
      <div class="history-actions">
        <button type="button" data-restore-id="${entry.id}">Restore</button>
        <button type="button" data-export-id="${entry.id}">Export PDF</button>
      </div>
    `;

    elements.historyList.appendChild(historyItem);
  });

  elements.historyList.querySelectorAll("[data-restore-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = historyEntries.find((item) => item.id === button.dataset.restoreId);
      if (entry) restoreHistoryEntry(entry);
    });
  });

  elements.historyList.querySelectorAll("[data-export-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = historyEntries.find((item) => item.id === button.dataset.exportId);
      if (entry) exportHistoryEntryToPdf(entry);
    });
  });
}

function restoreHistoryEntry(entry) {
  elements.courseTableBody.innerHTML = "";
  setStudentInfo(entry.studentInfo || {});
  entry.courses.forEach((course) => {
    const row = createCourseRow({
      name: course.name,
      credits: course.credits,
      grade: course.grade,
    });
    elements.courseTableBody.appendChild(row);
  });

  if (elements.courseTableBody.children.length === 0) {
    addDefaultRows();
  }

  updateResultPanel({
    totalCredits: entry.totalCredits,
    totalGradePoints: entry.totalGradePoints,
    courseSummaries: entry.courses,
    gpa: entry.gpa,
  }, entry.studentInfo || getStudentInfo());

  refreshAllPoints();
  showToast("History restored to the calculator.", "success");
}

function addDefaultRows(count = DEFAULT_COURSE_ROW_COUNT) {
  for (let index = 0; index < count; index += 1) {
    elements.courseTableBody.appendChild(createCourseRow());
  }
}

function clearForm() {
  setStudentInfo({ semester: "First Semester" });
  elements.courseTableBody.innerHTML = "";
  addDefaultRows();
  clearAllValidation();
  updateResultPanel({ totalCredits: 0, totalGradePoints: 0, courseSummaries: [], gpa: 0 }, { name: "Student" });
  elements.validationNote.textContent = "Enter valid course details to calculate your GPA.";
  showToast("Form cleared.", "info");
}

function validateAndCalculate(event) {
  event.preventDefault();
  const courses = collectCourseRows();
  const { isValid: studentIsValid, studentInfo } = validateStudentInfo();
  let formIsValid = true;

  clearAllValidation();

  courses.forEach((course) => {
    const isRowValid = validateCourseRow(course);
    formIsValid = formIsValid && isRowValid;
  });

  if (!studentIsValid || !formIsValid) {
    showToast("Please complete every course row correctly.", "error");
    elements.validationNote.textContent = !studentIsValid
      ? "Student full name is required before GPA calculation."
      : "Fix the highlighted fields and try again.";
    return;
  }

  const summary = calculateGpa(courses);
  updateResultPanel(summary, studentInfo);
  const savedEntry = saveHistoryEntry(summary);
  showToast(`GPA calculated: ${savedEntry.gpa.toFixed(2)}.`, "success");
}

function exportHistoryEntryToPdf(entry) {
  const jsPdfApi = window.jspdf?.jsPDF;
  if (!jsPdfApi) {
    showToast("PDF library is still loading. Try again in a moment.", "error");
    return;
  }

  const pdf = new jsPdfApi({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const tableWidth = pageWidth - 84;
  const studentInfo = entry.studentInfo || {};
  const margin = 42;
  let cursorY = 52;

  pdf.setFillColor(10, 18, 34);
  pdf.rect(0, 0, pageWidth, 70, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Neon GPA Report", margin, 36);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Date Generated: ${new Date(entry.timestamp).toLocaleString()}`, margin, 54);

  cursorY = 92;
  pdf.setDrawColor(224, 231, 243);
  pdf.setFillColor(248, 250, 255);
  pdf.roundedRect(margin, cursorY, tableWidth, 120, 8, 8, "FD");

  cursorY += 22;
  pdf.setTextColor(20, 28, 44);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("Student Information", margin + 12, cursorY);

  cursorY += 18;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(`Name: ${studentInfo.name || "N/A"}`, margin + 12, cursorY);
  cursorY += 16;
  pdf.text(`Student ID: ${studentInfo.studentId || "N/A"}`, margin + 12, cursorY);
  cursorY += 16;
  pdf.text(`Program: ${studentInfo.program || "N/A"}`, margin + 12, cursorY);
  cursorY += 16;
  pdf.text(`Level: ${studentInfo.level || "N/A"}`, margin + 12, cursorY);
  cursorY += 16;
  pdf.text(`Semester: ${studentInfo.semester || "N/A"}`, margin + 12, cursorY);

  cursorY += 28;
  pdf.setFillColor(248, 250, 255);
  pdf.roundedRect(margin, cursorY, tableWidth, 96, 8, 8, "FD");

  cursorY += 22;
  pdf.setTextColor(20, 28, 44);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("Academic Summary", margin + 12, cursorY);

  cursorY += 18;
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text(`GPA: ${entry.gpa.toFixed(2)}`, margin + 12, cursorY);
  pdf.text(`Classification: ${entry.classification}`, margin + 180, cursorY);
  cursorY += 16;
  pdf.text(`Total Credits: ${entry.totalCredits}`, margin + 12, cursorY);
  pdf.text(`Total Grade Points: ${entry.totalGradePoints.toFixed(2)}`, margin + 180, cursorY);

  cursorY += 30;
  pdf.setFont("helvetica", "bold");
  pdf.text("Course Breakdown", margin, cursorY);

  cursorY += 14;
  pdf.setFillColor(240, 245, 255);
  pdf.rect(margin, cursorY, tableWidth, 24, "F");
  pdf.setFontSize(10);
  pdf.setTextColor(30, 38, 56);
  pdf.text("Course", margin + 8, cursorY + 16);
  pdf.text("Credits", margin + 250, cursorY + 16);
  pdf.text("Grade", margin + 320, cursorY + 16);
  pdf.text("Points", margin + 395, cursorY + 16);

  cursorY += 24;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(20, 28, 44);

  entry.courses.forEach((course, index) => {
    if (cursorY > 740) {
      pdf.addPage();
      cursorY = 52;
    }

    if (index % 2 === 0) {
      pdf.setFillColor(251, 253, 255);
      pdf.rect(margin, cursorY, tableWidth, 22, "F");
    }

    const courseName = pdf.splitTextToSize(course.name, 220)[0] || "-";
    pdf.text(courseName, margin + 8, cursorY + 15);
    pdf.text(String(course.credits), margin + 250, cursorY + 15);
    pdf.text(course.grade, margin + 320, cursorY + 15);
    pdf.text(course.weightedPoints.toFixed(2), margin + 395, cursorY + 15);
    cursorY += 22;
  });

  const footerY = pdf.internal.pageSize.getHeight() - 28;
  pdf.setFontSize(9);
  pdf.setTextColor(80, 90, 116);
  pdf.text("Generated by Damptey James-MightyX", margin, footerY);

  const filename = `gpa-report-${entry.gpa.toFixed(2).replace(".", "-")}.pdf`;
  pdf.save(filename);
  showToast("PDF report exported.", "success");
}

function exportCurrentSummaryToPdf(summary, studentInfo) {
  const entry = {
    timestamp: new Date().toISOString(),
    gpa: summary.gpa,
    totalCredits: summary.totalCredits,
    totalGradePoints: summary.totalGradePoints,
    classification: getClassification(summary.gpa),
    courses: summary.courseSummaries,
    studentInfo,
  };
  exportHistoryEntryToPdf(entry);
}

function loadDemoCourses() {
  const demoData = [
    { name: "CS 201", credits: 3, grade: "A" },
    { name: "MTH 205", credits: 4, grade: "B+" },
    { name: "STA 203", credits: 3, grade: "B" },
    { name: "ENG 202", credits: 2, grade: "C+" },
  ];

  elements.courseTableBody.innerHTML = "";
  demoData.forEach((course) => elements.courseTableBody.appendChild(createCourseRow(course)));
  showToast("Sample courses loaded.", "info");
}

function setupThemeToggle() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "dark";
  applyTheme(savedTheme);

  elements.themeToggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    applyTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    showToast(`Switched to ${nextTheme} theme.`, "info");
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  elements.body.classList.toggle("theme-light", theme === "light");
  elements.themeToggle.querySelector(".toggle-icon").textContent = theme === "light" ? "◑" : "◐";
}

function setupParticles() {
  const particleCount = 24;
  elements.particleField.innerHTML = "";
  for (let index = 0; index < particleCount; index += 1) {
    const particle = document.createElement("span");
    particle.className = "particle";
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.bottom = `${Math.random() * 20}%`;
    particle.style.animationDuration = `${10 + Math.random() * 10}s`;
    particle.style.animationDelay = `${Math.random() * 10}s`;
    particle.style.opacity = `${0.2 + Math.random() * 0.6}`;
    particle.style.transform = `scale(${0.8 + Math.random() * 1.8})`;
    elements.particleField.appendChild(particle);
  }
}

function loadHistory() {
  try {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    historyEntries = storedHistory ? JSON.parse(storedHistory) : [];
  } catch {
    historyEntries = [];
  }
  renderHistory();
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

function cryptoRandomId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}

function resetAll() {
  clearForm();
  showToast("Calculator reset.", "info");
}

function clearHistory() {
  historyEntries = [];
  localStorage.removeItem(HISTORY_STORAGE_KEY);
  renderHistory();
  showToast("History cleared.", "info");
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key.toLowerCase() === "enter") {
      event.preventDefault();
      elements.gpaForm.requestSubmit();
    }
  });
}

function setupButtons() {
  elements.addCourseBtn.addEventListener("click", () => {
    elements.courseTableBody.appendChild(createCourseRow());
    showToast("Added a new course row.", "success");
  });

  elements.resetBtn.addEventListener("click", resetAll);
  elements.clearHistoryBtn.addEventListener("click", clearHistory);
    if (elements.clearHistoryPanelBtn) {
      elements.clearHistoryPanelBtn.addEventListener("click", clearHistory);
    }
  elements.loadDemoBtn.addEventListener("click", () => {
    loadDemoCourses();
    refreshAllPoints();
    showToast("Demo data is ready.", "success");
  });
}

function setupForm() {
  elements.gpaForm.addEventListener("submit", validateAndCalculate);
}

function setupStudentFieldEvents() {
  [
    elements.studentName,
    elements.studentId,
    elements.studentProgram,
    elements.academicLevel,
    elements.semester,
  ].forEach((field) => {
    field.addEventListener("input", () => clearValidation(field));
    field.addEventListener("change", () => clearValidation(field));
  });
}

function setupPdfExportShortcut() {
  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.className = "ghost-button";
  exportButton.textContent = "Export current PDF";
  exportButton.style.marginTop = "12px";

  exportButton.addEventListener("click", () => {
    const courses = collectCourseRows();
    const { isValid: studentIsValid, studentInfo } = validateStudentInfo();
    let valid = true;
    clearAllValidation();
    courses.forEach((course) => {
      valid = validateCourseRow(course) && valid;
    });

    if (!studentIsValid || !valid) {
      showToast("Calculate with valid data before exporting.", "error");
      return;
    }

    exportCurrentSummaryToPdf(calculateGpa(courses), studentInfo);
  });

  elements.validationNote.insertAdjacentElement("afterend", exportButton);
}

function initializeApp() {
  cacheElements();
  elements.currentYear.textContent = String(new Date().getFullYear());
  setupThemeToggle();
  setupParticles();
  setupButtons();
  setupForm();
  setupStudentFieldEvents();
  setupKeyboardShortcuts();
  setupPdfExportShortcut();
  loadHistory();
  addDefaultRows();
  setStudentInfo({ semester: "First Semester" });
  updateResultPanel({ totalCredits: 0, totalGradePoints: 0, courseSummaries: [], gpa: 0 }, { name: "Student" });

  window.addEventListener("storage", (event) => {
    if (event.key === HISTORY_STORAGE_KEY) {
      loadHistory();
    }
    if (event.key === THEME_STORAGE_KEY) {
      applyTheme(event.newValue || "dark");
    }
  });
}

document.addEventListener("DOMContentLoaded", initializeApp);
