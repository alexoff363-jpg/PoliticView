// Simple logging utility that also mirrors into the Activity & Diagnostics console.

(function () {
  const LOG_ELEMENT_ID = "pv-log-output";

  function timestamp() {
    return new Date().toISOString().split("T")[1].replace("Z", "");
  }

  function write(level, message, meta) {
    const target = document.getElementById(LOG_ELEMENT_ID);
    const line = `[${timestamp()}] [${level}] ${message}${
      meta ? " " + JSON.stringify(meta) : ""
    }\n`;

    // Console output
    if (level === "ERROR") {
      console.error("[PoliticView]", message, meta || "");
    } else if (level === "WARN") {
      console.warn("[PoliticView]", message, meta || "");
    } else {
      console.log("[PoliticView]", message, meta || "");
    }

    if (!target) return;
    target.textContent += line;
    target.scrollTop = target.scrollHeight;
  }

  window.PoliticViewLogger = {
    info(message, meta) {
      write("INFO", message, meta);
    },
    warn(message, meta) {
      write("WARN", message, meta);
    },
    error(message, meta) {
      write("ERROR", message, meta);
    }
  };
})();

