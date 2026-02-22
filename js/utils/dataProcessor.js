/**
 * Data Processing & Validation Module
 * Professional backend logic for PoliticView
 * Ensures all API data is properly filtered, validated, and utilized
 */

(function () {
  const logger = window.PoliticViewLogger;

  // Party-specific keyword configuration
  const PARTY_KEYWORDS = {
    'TVK': {
      primary: ['tvk', 'vijay', 'tamizhaga vettri kazhagam'],
      secondary: ['thalapathy', 'actor vijay', 'vettri kazhagam'],
      leaders: ['vijay'],
      exclude: []
    },
    'DMK': {
      primary: ['dmk', 'dravida munnetra kazhagam', 'stalin'],
      secondary: ['mk stalin', 'chief minister', 'cm stalin'],
      leaders: ['stalin', 'mk stalin', 'udhayanidhi'],
      exclude: []
    },
    'ADMK': {
      primary: ['admk', 'aiadmk', 'all india anna dravida munnetra kazhagam'],
      secondary: ['palaniswami', 'eps', 'edappadi', 'amma'],
      leaders: ['palaniswami', 'eps', 'edappadi', 'jayalalithaa'],
      exclude: []
    },
    'BJP': {
      primary: ['bjp', 'bharatiya janata party', 'annamalai'],
      secondary: ['k annamalai', 'saffron', 'hindutva'],
      leaders: ['annamalai', 'modi', 'narendra modi'],
      exclude: []
    }
  };

  /**
   * Check if text contains party-specific keywords
   * @param {string} text - Text to analyze
   * @param {string} party - Party name (TVK, DMK, ADMK, BJP)
   * @param {boolean} strict - If true, requires primary keyword match
   * @returns {boolean}
   */
  function containsPartyKeywords(text, party, strict = false) {
    if (!text || !party || party === 'Global') return true;
    
    const keywords = PARTY_KEYWORDS[party];
    if (!keywords) return true;

    const lowerText = text.toLowerCase();
    
    // Check for excluded keywords first
    if (keywords.exclude.some(kw => lowerText.includes(kw))) {
      return false;
    }

    // Check primary keywords
    const hasPrimary = keywords.primary.some(kw => lowerText.includes(kw));
    if (hasPrimary) return true;

    // If strict mode, only primary keywords count
    if (strict) return false;

    // Check secondary keywords
    const hasSecondary = keywords.secondary.some(kw => lowerText.includes(kw));
    if (hasSecondary) return true;

    // Check leader names
    const hasLeader = keywords.leaders.some(kw => lowerText.includes(kw));
    if (hasLeader) return true;

    // Also accept if it mentions Tamil Nadu politics generally
    const hasTNPolitics = lowerText.includes('tamil nadu') || 
                          lowerText.includes('tn politics') ||
                          lowerText.includes('chennai');
    
    return hasTNPolitics;
  }

  /**
   * Calculate relevance score for a news item
   * @param {object} item - News item with title, description, content
   * @param {string} party - Party name
   * @returns {number} - Score from 0 to 100
   */
  function calculateRelevanceScore(item, party) {
    if (!item || party === 'Global') return 100;

    const keywords = PARTY_KEYWORDS[party];
    if (!keywords) return 50;

    const text = [
      item.title || '',
      item.description || '',
      item.content || ''
    ].join(' ').toLowerCase();

    let score = 0;

    // Primary keyword match: +40 points
    keywords.primary.forEach(kw => {
      if (text.includes(kw)) score += 40;
    });

    // Secondary keyword match: +20 points
    keywords.secondary.forEach(kw => {
      if (text.includes(kw)) score += 20;
    });

    // Leader name match: +30 points
    keywords.leaders.forEach(kw => {
      if (text.includes(kw)) score += 30;
    });

    // Tamil Nadu context: +10 points
    if (text.includes('tamil nadu') || text.includes('tn politics')) {
      score += 10;
    }

    // Cap at 100
    return Math.min(100, score);
  }

  /**
   * Filter news items by party relevance
   * @param {Array} items - Array of news items
   * @param {string} party - Party name
   * @param {number} minScore - Minimum relevance score (default: 30)
   * @returns {Array} - Filtered and sorted items
   */
  function filterByPartyRelevance(items, party, minScore = 30) {
    if (!items || !Array.isArray(items)) return [];
    if (party === 'Global') return items;

    return items
      .map(item => ({
        ...item,
        relevanceScore: calculateRelevanceScore(item, party)
      }))
      .filter(item => item.relevanceScore >= minScore)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Check if text is primarily English
   * @param {string} text - Text to check
   * @param {number} threshold - Minimum English ratio (default: 0.7)
   * @returns {boolean}
   */
  function isEnglish(text, threshold = 0.7) {
    if (!text) return false;
    
    const englishChars = text.match(/[a-zA-Z\s]/g);
    if (!englishChars) return false;
    
    const ratio = englishChars.length / text.length;
    return ratio >= threshold;
  }

  /**
   * Extract sentiment indicators from text
   * @param {string} text - Text to analyze
   * @returns {object} - Sentiment indicators
   */
  function extractSentimentIndicators(text) {
    if (!text) return { positive: 0, negative: 0, neutral: 0 };

    const lowerText = text.toLowerCase();

    const positiveWords = [
      'success', 'win', 'victory', 'growth', 'improve', 'better', 'good',
      'excellent', 'achievement', 'progress', 'support', 'praise', 'welcome'
    ];

    const negativeWords = [
      'fail', 'loss', 'defeat', 'decline', 'worse', 'bad', 'poor',
      'crisis', 'scandal', 'corruption', 'protest', 'oppose', 'criticize',
      'condemn', 'attack', 'controversy'
    ];

    let positive = 0;
    let negative = 0;

    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\w*\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) positive += matches.length;
    });

    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\w*\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) negative += matches.length;
    });

    const total = positive + negative;
    const neutral = total === 0 ? 1 : 0;

    return {
      positive,
      negative,
      neutral,
      score: total === 0 ? 0 : (positive - negative) / total
    };
  }

  /**
   * Aggregate data from multiple sources
   * @param {object} feeds - Object containing arrays from different sources
   * @param {string} party - Party name for filtering
   * @returns {object} - Aggregated and analyzed data
   */
  function aggregateFeeds(feeds, party) {
    const aggregated = {
      totalItems: 0,
      filteredItems: 0,
      bySource: {},
      sentiment: { positive: 0, negative: 0, neutral: 0 },
      topKeywords: [],
      timeline: []
    };

    Object.entries(feeds).forEach(([source, items]) => {
      if (!Array.isArray(items)) return;

      aggregated.totalItems += items.length;

      // Filter by party relevance
      const filtered = filterByPartyRelevance(items, party, 30);
      aggregated.filteredItems += filtered.length;

      aggregated.bySource[source] = {
        total: items.length,
        filtered: filtered.length,
        items: filtered
      };

      // Aggregate sentiment
      filtered.forEach(item => {
        const text = [item.title, item.description, item.content].join(' ');
        const sentiment = extractSentimentIndicators(text);
        aggregated.sentiment.positive += sentiment.positive;
        aggregated.sentiment.negative += sentiment.negative;
        aggregated.sentiment.neutral += sentiment.neutral;
      });
    });

    // Calculate overall sentiment score
    const totalSentiment = aggregated.sentiment.positive + aggregated.sentiment.negative;
    aggregated.sentiment.score = totalSentiment === 0 ? 0 :
      (aggregated.sentiment.positive - aggregated.sentiment.negative) / totalSentiment;

    return aggregated;
  }

  /**
   * Validate data quality
   * @param {Array} items - Data items to validate
   * @returns {object} - Validation report
   */
  function validateDataQuality(items) {
    if (!items || !Array.isArray(items)) {
      return { valid: false, issues: ['Invalid data format'] };
    }

    const issues = [];
    let validCount = 0;

    items.forEach((item, index) => {
      if (!item.title && !item.content) {
        issues.push(`Item ${index}: Missing title and content`);
      } else {
        validCount++;
      }

      if (item.title && !isEnglish(item.title, 0.5)) {
        issues.push(`Item ${index}: Non-English title detected`);
      }
    });

    return {
      valid: validCount > 0,
      validCount,
      totalCount: items.length,
      validRatio: items.length > 0 ? validCount / items.length : 0,
      issues: issues.slice(0, 10) // Limit to first 10 issues
    };
  }

  /**
   * Prepare data for sentiment analysis
   * @param {Array} items - News items
   * @param {string} party - Party name
   * @returns {object} - Prepared data with context
   */
  function prepareForSentimentAnalysis(items, party) {
    const filtered = filterByPartyRelevance(items, party, 40);
    
    const text = filtered
      .slice(0, 20)
      .map(item => item.title + (item.description ? '. ' + item.description : ''))
      .join('\n');

    const keywords = PARTY_KEYWORDS[party] || {};
    
    return {
      text,
      itemCount: filtered.length,
      party,
      keywords: [...(keywords.primary || []), ...(keywords.leaders || [])],
      context: `Analyzing ${filtered.length} ${party}-related news items from Tamil Nadu`
    };
  }

  /**
   * Extract key topics from text
   * @param {string} text - Text to analyze
   * @param {number} limit - Maximum number of topics
   * @returns {Array} - Array of topics with frequency
   */
  function extractKeyTopics(text, limit = 10) {
    if (!text) return [];

    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word, count]) => ({ word, count }));
  }

  // Export functions
  window.PoliticViewDataProcessor = {
    containsPartyKeywords,
    calculateRelevanceScore,
    filterByPartyRelevance,
    isEnglish,
    extractSentimentIndicators,
    aggregateFeeds,
    validateDataQuality,
    prepareForSentimentAnalysis,
    extractKeyTopics,
    PARTY_KEYWORDS
  };

  logger.info("Data Processor module loaded");
})();
