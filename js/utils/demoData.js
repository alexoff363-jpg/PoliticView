// Demo / fallback data generators for when real APIs are unavailable
// or API keys are not configured. This keeps PoliticView usable in
// "offline intelligence" mode.

(function () {
  const emotions = ["anger", "trust", "fear", "joy", "disgust", "anticipation", "surprise", "sadness"];

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomInt(min, max) {
    return Math.floor(randomBetween(min, max + 1));
  }

  function normalize(values) {
    const sum = values.reduce((a, b) => a + b, 0) || 1;
    return values.map((v) => +(v / sum).toFixed(2));
  }

  function generateSentimentPulsePoints(count = 24) {
    const points = [];
    let base = randomBetween(0.35, 0.65);
    for (let i = 0; i < count; i++) {
      base = Math.min(0.95, Math.max(0.05, base + randomBetween(-0.08, 0.08)));
      points.push({
        t: i,
        sentiment: +(base.toFixed(2))
      });
    }
    return points;
  }

  function generateEmotionHeatmap() {
    const values = emotions.map(() => randomBetween(0.2, 1));
    const normalized = normalize(values);
    const result = {};
    emotions.forEach((e, idx) => {
      result[e] = normalized[idx];
    });
    return result;
  }

  function generateTrendInflections() {
    const templates = [
      {
        title: "Narrative spike: economic anxiety",
        impact: "Backlash risk rising in urban middle class.",
        severity: "high"
      },
      {
        title: "Trust recovery after policy clarification",
        impact: "Improved sentiment among swing voters.",
        severity: "medium"
      },
      {
        title: "Youth meme trend around speech excerpt",
        impact: "High viral potential, but tone is ironic.",
        severity: "watch"
      }
    ];
    return templates.map((tpl) => ({
      ...tpl,
      scoreChange: randomInt(-35, 45),
      horizon: ["24h", "3d", "7d"][randomInt(0, 2)]
    }));
  }

  function generateRegionalSentiment() {
    const regions = ["North", "South", "East", "West", "Urban", "Rural"];
    return regions.map((r) => ({
      region: r,
      support: randomInt(20, 75),
      opposition: randomInt(10, 60),
      undecided: randomInt(5, 40)
    }));
  }

  window.PoliticViewDemoData = {
    sentimentPulse() {
      return generateSentimentPulsePoints();
    },
    emotionHeatmap() {
      return generateEmotionHeatmap();
    },
    trendInflections() {
      return generateTrendInflections();
    },
    regionalSentiment() {
      return generateRegionalSentiment();
    }
  };
})();

