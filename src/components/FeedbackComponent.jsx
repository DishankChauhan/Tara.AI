import React, { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, Send } from 'lucide-react';

const FeedbackComponent = ({ sessionId, onFeedbackSubmit }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [wasHelpful, setWasHelpful] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [startTime] = useState(Date.now()); // Track when component mounted

  const submitFeedback = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch('http://localhost:5001/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          userRating: rating,
          userFeedback: feedback.trim() || null,
          wasHelpful,
          timeSpentReading: Date.now() - startTime, // You'd track this properly
          audioPlayedToEnd: true, // You'd track this from audio player
          voiceInterrupted: false
        })
      });

      if (response.ok) {
        setIsSubmitted(true);
        setTimeout(() => setIsVisible(false), 2000);
        if (onFeedbackSubmit) {
          onFeedbackSubmit({ rating, feedback, wasHelpful });
        }
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  if (!isVisible) return null;

  if (isSubmitted) {
    return (
      <div className="feedback-component submitted">
        <div className="feedback-success">
          <span>✅ धन्यवाद! आपका फीडबैक मिल गया।</span>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-component">
      <div className="feedback-header">
        <h4>क्या यह जवाब मददगार था?</h4>
      </div>
      
      <div className="feedback-actions">
        {/* Quick helpful/not helpful */}
        <div className="quick-feedback">
          <button 
            className={`thumb-btn ${wasHelpful === true ? 'active' : ''}`}
            onClick={() => setWasHelpful(true)}
          >
            <ThumbsUp size={16} />
            हाँ
          </button>
          <button 
            className={`thumb-btn ${wasHelpful === false ? 'active' : ''}`}
            onClick={() => setWasHelpful(false)}
          >
            <ThumbsDown size={16} />
            नहीं
          </button>
        </div>

        {/* Star rating */}
        <div className="star-rating">
          <span>रेटिंग दें:</span>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className={`star ${rating >= star ? 'filled' : ''}`}
              onClick={() => setRating(star)}
            >
              <Star size={16} />
            </button>
          ))}
        </div>

        {/* Optional text feedback */}
        {(wasHelpful === false || rating <= 3) && (
          <div className="text-feedback">
            <textarea
              placeholder="कृपया बताएं कि हम कैसे सुधार कर सकते हैं..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
            />
          </div>
        )}

        {/* Submit button */}
        {(wasHelpful !== null || rating > 0) && (
          <button className="submit-feedback-btn" onClick={submitFeedback}>
            <Send size={14} />
            भेजें
          </button>
        )}
      </div>

      <style>{`
        .feedback-component {
          background: linear-gradient(135deg, #fff7e6 0%, #fff1d6 100%);
          border: 1px solid #ffd700;
          border-radius: 12px;
          padding: 16px;
          margin-top: 16px;
          box-shadow: 0 2px 8px rgba(255, 215, 0, 0.1);
        }

        .feedback-component.submitted {
          background: linear-gradient(135deg, #e7f5e7 0%, #d6f0d6 100%);
          border-color: #4caf50;
        }

        .feedback-header h4 {
          margin: 0 0 12px 0;
          color: #d2691e;
          font-size: 14px;
          font-weight: 600;
        }

        .feedback-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .quick-feedback {
          display: flex;
          gap: 8px;
        }

        .thumb-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border: 1px solid #ffd700;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          color: #d2691e;
          transition: all 0.2s;
        }

        .thumb-btn:hover {
          background: #fff9e6;
        }

        .thumb-btn.active {
          background: #ffd700;
          color: white;
        }

        .star-rating {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #d2691e;
        }

        .star {
          background: none;
          border: none;
          cursor: pointer;
          color: #ddd;
          transition: color 0.2s;
        }

        .star.filled {
          color: #ffd700;
        }

        .star:hover {
          color: #ffd700;
        }

        .text-feedback textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ffd700;
          border-radius: 6px;
          font-size: 12px;
          font-family: inherit;
          resize: vertical;
          min-height: 40px;
        }

        .text-feedback textarea:focus {
          outline: none;
          border-color: #d2691e;
          box-shadow: 0 0 0 2px rgba(210, 105, 30, 0.1);
        }

        .submit-feedback-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: #d2691e;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: background 0.2s;
          align-self: flex-start;
        }

        .submit-feedback-btn:hover {
          background: #b8541a;
        }

        .feedback-success {
          text-align: center;
          color: #2e7d32;
          font-size: 14px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default FeedbackComponent;
