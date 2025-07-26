// Interaction data model for Firebase self-learning system
const { db, collection, doc, setDoc, addDoc, getDoc, Timestamp } = require('../config/firebase');

class InteractionModel {
  constructor() {
    this.collectionName = 'interactions';
  }

  // Create a new interaction record
  async create(interactionData) {
    try {
      // Convert Date objects to Firestore Timestamps
      const sanitizedData = {
        ...interactionData,
        timestamp: interactionData.timestamp ? Timestamp.fromDate(interactionData.timestamp) : Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, this.collectionName), sanitizedData);
      
      console.log('📊 Interaction saved to Firebase:', docRef.id);
      return { id: docRef.id, ...sanitizedData };
    } catch (error) {
      console.error('❌ Error saving interaction to Firebase:', error);
      throw error;
    }
  }

  // Update interaction with feedback
  async updateWithFeedback(sessionId, feedbackData) {
    try {
      const docRef = doc(db, this.collectionName, sessionId);
      await setDoc(docRef, {
        ...feedbackData,
        updatedAt: Timestamp.now()
      }, { merge: true });
      
      console.log('📝 Feedback updated in Firebase for session:', sessionId);
      return true;
    } catch (error) {
      console.error('❌ Error updating feedback in Firebase:', error);
      throw error;
    }
  }

  // Get interaction by session ID
  async getBySessionId(sessionId) {
    try {
      const docRef = doc(db, this.collectionName, sessionId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting interaction from Firebase:', error);
      throw error;
    }
  }
}

module.exports = InteractionModel;
