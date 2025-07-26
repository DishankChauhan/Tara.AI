// Self-learning analytics and improvement system for Firebase
const { db, collection, getDocs, query, where, orderBy, limit } = require('../config/firebase');

class LearningAnalytics {
  
  // Analyze user feedback patterns
  async analyzeUserFeedback(timeRange = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);
    
    const analytics = await Interaction.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: {
            language: '$language',
            subject: '$subject',
            grade: '$grade'
          },
          avgRating: { $avg: '$userRating' },
          totalInteractions: { $sum: 1 },
          positiveCount: { $sum: { $cond: [{ $gte: ['$userRating', 4] }, 1, 0] } },
          negativeCount: { $sum: { $cond: [{ $lte: ['$userRating', 2] }, 1, 0] } },
          avgResponseTime: { $avg: '$responseTime' },
          avgTokensUsed: { $avg: '$tokensUsed' },
          commonIssues: { $push: '$userFeedback' }
        }
      },
      { $sort: { avgRating: 1 } } // Lowest rated first for improvement
    ]);
    
    return analytics;
  }
  
  // Identify knowledge gaps
  async identifyKnowledgeGaps() {
    const gaps = await Interaction.aggregate([
      {
        $match: {
          $or: [
            { userRating: { $lte: 2 } },
            { retryCount: { $gte: 2 } },
            { flaggedForReview: true }
          ]
        }
      },
      {
        $group: {
          _id: {
            subject: '$subject',
            language: '$language',
            conceptDifficulty: '$conceptDifficulty'
          },
          count: { $sum: 1 },
          questions: { $push: '$question' },
          avgRetries: { $avg: '$retryCount' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    return gaps;
  }
  
  // Generate training data for fine-tuning
  async generateTrainingData(minRating = 4, maxTokens = 500) {
    const trainingData = await Interaction.find({
      userRating: { $gte: minRating },
      tokensUsed: { $lte: maxTokens },
      responseQuality: { $gte: 0.8 }
    }).select('question answer language subject grade userRating');
    
    // Format for fine-tuning
    const formattedData = trainingData.map(interaction => ({
      messages: [
        {
          role: "system",
          content: `You are Tara, an Indian female AI tutor teaching ${interaction.subject} in ${interaction.language}.`
        },
        {
          role: "user", 
          content: interaction.question
        },
        {
          role: "assistant",
          content: interaction.answer
        }
      ],
      metadata: {
        rating: interaction.userRating,
        subject: interaction.subject,
        language: interaction.language,
        grade: interaction.grade
      }
    }));
    
    return formattedData;
  }
  
  // Predict when fine-tuning is needed
  async shouldFineTune() {
    const recentData = await this.analyzeUserFeedback(7); // Last 7 days
    
    const criteria = {
      lowRatingThreshold: 0.3, // 30% of ratings below 3
      volumeThreshold: 1000, // At least 1000 interactions
      improvementPotential: 0.2 // 20% potential improvement
    };
    
    let shouldTune = false;
    let reasons = [];
    
    for (const data of recentData) {
      const lowRatingRatio = data.negativeCount / data.totalInteractions;
      
      if (lowRatingRatio > criteria.lowRatingThreshold && 
          data.totalInteractions > criteria.volumeThreshold) {
        shouldTune = true;
        reasons.push({
          category: `${data._id.subject}-${data._id.language}`,
          issue: 'High negative feedback ratio',
          ratio: lowRatingRatio,
          interactions: data.totalInteractions
        });
      }
    }
    
    return { shouldTune, reasons, criteria };
  }
  
  // Real-time quality scoring
  async scoreResponseQuality(question, answer, language, subject) {
    try {
      // Implement various quality metrics
      const metrics = {
        relevance: await this.calculateRelevance(question || '', answer || ''),
        languageQuality: await this.assessLanguageQuality(answer || '', language || 'en'),
        culturalContext: await this.assessCulturalRelevance(answer || '', language || 'en'),
        completeness: this.assessCompleteness(answer || ''),
        clarity: this.assessClarity(answer || '')
      };
      
      // Ensure all metrics are valid numbers
      Object.keys(metrics).forEach(key => {
        const value = Number(metrics[key]);
        metrics[key] = isNaN(value) ? 0 : Math.max(0, Math.min(1, value));
      });
      
      // Weighted average
      const weights = { relevance: 0.3, languageQuality: 0.25, culturalContext: 0.2, completeness: 0.15, clarity: 0.1 };
      
      const overallScore = Object.entries(metrics).reduce((sum, [key, value]) => {
        const weight = weights[key] || 0;
        const metricValue = Number(value) || 0;
        return sum + (metricValue * weight);
      }, 0);
      
      return { 
        overallScore: isNaN(overallScore) ? 0 : Math.max(0, Math.min(1, overallScore)), 
        metrics 
      };
    } catch (error) {
      console.error('Error in scoreResponseQuality:', error);
      return { 
        overallScore: 0, 
        metrics: { relevance: 0, languageQuality: 0, culturalContext: 0, completeness: 0, clarity: 0 }
      };
    }
  }
  
  // Helper methods for quality assessment
  calculateRelevance(question, answer) {
    try {
      if (!question || !answer) return 0;
      
      // Simple keyword overlap for now - can be enhanced with embeddings
      const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const answerWords = answer.toLowerCase().split(/\s+/);
      
      if (questionWords.length === 0) return 0;
      
      const overlap = questionWords.filter(word => answerWords.includes(word)).length;
      const relevance = overlap / questionWords.length;
      
      return Math.min(Math.max(relevance, 0), 1);
    } catch (error) {
      console.error('Error calculating relevance:', error);
      return 0;
    }
  }
  
  assessLanguageQuality(answer, language) {
    try {
      if (!answer) return 0;
      
      // Basic language-specific checks
      const checks = {
        hi: ['है', 'हैं', 'को', 'में', 'का'], // Common Hindi words
        en: ['the', 'is', 'are', 'to', 'of'],
        ta: ['உள்ளது', 'என்று', 'அது', 'இது'], // Tamil
        // Add more languages
      };
      
      const expectedWords = checks[language] || checks.en;
      const hasExpectedWords = expectedWords.some(word => answer.includes(word));
      
      return hasExpectedWords ? 0.8 : 0.4;
    } catch (error) {
      console.error('Error assessing language quality:', error);
      return 0;
    }
  }

  assessCulturalRelevance(answer, language) {
    try {
      if (!answer) return 0;
      
      const culturalMarkers = {
        hi: ['भारत', 'गांव', 'शहर', 'त्योहार', 'पारिवारिक', 'बॉलीवुड', 'क्रिकेट'],
        en: ['India', 'family', 'festival', 'cricket', 'Bollywood'],
        // Add more
      };
      
      const markers = culturalMarkers[language] || [];
      const relevantMarkers = markers.filter(marker => 
        answer.toLowerCase().includes(marker.toLowerCase())
      ).length;
      
      return Math.min(Math.max(relevantMarkers / 2, 0), 1); // Normalize to 0-1
    } catch (error) {
      console.error('Error assessing cultural relevance:', error);
      return 0;
    }
  }

  assessCompleteness(answer) {
    try {
      if (!answer) return 0;
      
      // Basic completeness checks
      const minLength = 50;
      const hasConclusion = /[।.!]$/.test(answer.trim());
      const hasExplanation = answer.length > minLength;
      
      return (hasConclusion ? 0.5 : 0) + (hasExplanation ? 0.5 : 0);
    } catch (error) {
      console.error('Error assessing completeness:', error);
      return 0;
    }
  }

  assessClarity(answer) {
    try {
      if (!answer) return 0;
      
      // Simple clarity metrics
      const sentences = answer.split(/[।.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length === 0) return 0;
      
      const avgSentenceLength = answer.length / sentences.length;
      
      // Optimal sentence length (20-30 words)
      const clarityScore = avgSentenceLength > 150 ? 0.3 : 
                          avgSentenceLength > 100 ? 0.6 : 
                          avgSentenceLength > 50 ? 0.9 : 0.7;
      
      return Math.min(Math.max(clarityScore, 0), 1);
    } catch (error) {
      console.error('Error assessing clarity:', error);
      return 0;
    }
  }
}

module.exports = LearningAnalytics;
