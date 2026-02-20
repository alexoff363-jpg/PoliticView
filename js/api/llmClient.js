(function () {
  const logger = window.PoliticViewLogger;
  const keys = window.POLITIC_VIEW_API_KEYS || {};

  function getModel() {
    return keys.llmModel || "";
  }

  function isEnabled() {
    return !!getModel();
  }

  async function generate({ prompt, system }) {
    const model = getModel();
    if (!model) {
      throw new Error("No llmModel configured in apiKeys.js");
    }

    logger.info("Calling Ollama LLM", { model });

    const res = await fetch("/api/llm/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, system, model })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM call failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    return (json && json.content) || "";
  }

  window.PoliticViewLlmClient = {
    isEnabled,
    getModel,
    generate
  };
})();

