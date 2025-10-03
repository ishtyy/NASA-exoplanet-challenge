# **Cosmic Detectives: A Robust ML Pipeline for Exoplanet Vetting**

**Project for the NASA Space Apps Challenge**

## **1\. Project Overview**

This project implements a state-of-the-art machine learning pipeline to automatically detect and vet exoplanet candidates from raw astronomical data. Our solution addresses the challenge of analyzing the vast amount of data produced by missions like K2 by creating a robust, end-to-end workflow from raw light curves to a final classification.

Our pipeline consists of three main stages:

1. **Advanced Feature Engineering:** We transform raw time-series light curves from the K2 mission into hundreds of statistical features using lightkurve and tsfresh.  
2. **High-Performance Stacking Model:** We use a stacking ensemble of three powerful gradient boosting models (XGBoost, LightGBM, CatBoost) with a Logistic Regression meta-model to achieve high predictive accuracy. The model is tuned using Optuna for optimal performance.  
3. **Interactive Web Application:** We have developed a web-based tool to demonstrate our model's capabilities and make it accessible.

## **2\. Final Results**

Our final stacking model, evaluated on out-of-fold predictions from the K2 dataset, achieved a **ROC AUC Score of 0.9582**.

### **Model Performance**

The confusion matrix shows excellent performance in distinguishing between CONFIRMED planets and FALSE POSITIVES.

### **Training Curves**

The base models all show healthy learning curves, demonstrating effective training.

## **3\. How to Run**

### **A. Reproduce the Model**

The full development process is documented in the notebook/exoplanet\_pipeline.ipynb file. To run it:

1. Create a Python virtual environment and install the required libraries: pip install \-r requirements.txt.  
2. Launch Jupyter Notebook: jupyter notebook.  
3. Open and run the cells in notebook/exoplanet\_pipeline.ipynb in order.

### **B. Run the Web Application**

1. Navigate to the /web\_app directory.  
2. Run the Flask application: python app.py.  
3. Open your web browser and go to http://127.0.0.1:5000 to use the tool.

*This project was developed by Team AstraNova.*