# Fraud Pattern Detector

A sophisticated fraud detection system built with React that identifies fraudulent transactions using rule-based scoring algorithms and real-time analytics.

## 🎯 Project Overview

**Objective**: Identify fraudulent transactions through feature extraction and rule-based scoring
**Demo**: Real-time precision/recall metrics with interactive dashboard
**Technology**: React, Synthetic Data Generation, Rule-Based Fraud Scoring

## ✨ Key Features

- 🤖 **Intelligent Fraud Detection** - Rule-based scoring with customizable weights
- 📊 **Real-time Analytics** - Live precision, recall, F1 score, and accuracy metrics
- 🎨 **Modern UI** - Dark/light theme with professional dashboard
- 🔍 **Advanced Filtering** - Search and filter transactions by multiple criteria
- ⚙️ **Customizable Rules** - Adjustable fraud threshold and rule weights
- 📈 **Data Visualization** - Interactive charts and confusion matrix
- 💾 **Export Functionality** - Download results as CSV

## 🚀 Technical Implementation

### **Fraud Detection Algorithm**
```javascript
// Rule-based scoring with customizable weights
function scoreTransaction(txn, threshold = 50, weights = {}) {
  let score = 0;
  const reasons = [];
  
  // High amount detection
  if (txn.amount > 1000) { score += weights.highAmount || 35; }
  
  // Odd hour detection  
  if (txn.hour >= 0 && txn.hour <= 4) { score += weights.oddHour || 25; }
  
  // High-risk country detection
  if (!["US", "UK", "CA"].includes(txn.country)) { score += weights.riskyCountry || 30; }
  
  // Rapid transaction detection
  if (txn.prevTxnGap < 5) { score += weights.rapidTxn || 20; }
  
  // Suspicious merchant detection
  if (["Casino Royale", "QuickCash ATM", "Unknown Vendor"].includes(txn.merchant)) {
    score += weights.suspiciousMerchant || 25;
  }
  
  return { score: Math.min(score, 100), flaggedAsFraud: score >= threshold, reasons };
}
```

### **Metrics Calculation**
- **Precision**: TP / (TP + FP) - Accuracy of fraud predictions
- **Recall**: TP / (TP + FN) - Coverage of actual fraud detection  
- **F1 Score**: 2 × (Precision × Recall) / (Precision + Recall) - Balanced performance metric
- **Accuracy**: (TP + TN) / Total - Overall correct classification rate

## 🎮 Interactive Features

### **Advanced Controls**
- **Fraud Threshold Slider** (30-80%) - Adjust detection sensitivity
- **Rule Weight Configuration** - Fine-tune each detection rule
- **Real-time Updates** - Metrics update instantly with parameter changes

### **Data Management**
- **Synthetic Dataset Generation** - 120 transactions with 18% fraud rate
- **Search Functionality** - Filter by ID, merchant, or country
- **CSV Export** - Download transaction results for analysis

## 📊 Dashboard Components

1. **Metrics Gauges** - Visual representation of precision, recall, F1, accuracy
2. **Confusion Matrix** - TP/FP/FN/TN breakdown with color coding
3. **Risk Distribution** - Histogram of fraud scores by risk level
4. **Transaction Log** - Detailed transaction analysis with reasoning

## 🛠️ Technology Stack

- **Frontend**: React 18 with hooks
- **Styling**: Inline styles with CSS-in-JS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Package Manager**: npm

## 🎯 Business Applications

This fraud detection system demonstrates:
- **Algorithm Implementation** - Rule-based fraud scoring
- **Data Visualization** - Real-time metrics and analytics
- **User Experience** - Professional, intuitive interface
- **Performance Optimization** - Efficient React state management

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📈 Performance Metrics

The system achieves:
- **High Precision**: Minimizes false alarms
- **Strong Recall**: Catches majority of fraud attempts  
- **Balanced F1**: Optimizes security vs. customer experience
- **Real-time Processing**: Efficient transaction analysis

## 🎨 Design Features

- **Responsive Layout** - Full-screen design with proper scaling
- **Dark/Light Theme** - Professional UI with smooth transitions
- **Interactive Elements** - Hover effects and micro-animations
- **Accessibility** - Proper color contrast and keyboard navigation

## 📝 License

MIT License - Feel free to use this project for learning and development purposes.
