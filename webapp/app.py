from flask import Flask, render_template, jsonify, request
import joblib
import pandas as pd
import numpy as np
import lightkurve as lk
from tsfresh import extract_features
from tsfresh.feature_extraction import MinimalFCParameters
import warnings
import os

warnings.filterwarnings('ignore')
app = Flask(__name__)

# --- Load Model Artifacts at Startup ---
try:
    MODEL_PATH = "models/"
    meta_model = joblib.load(os.path.join(MODEL_PATH, 'meta_model.joblib'))
    scaler = joblib.load(os.path.join(MODEL_PATH, 'scaler.joblib'))
    label_encoder = joblib.load(os.path.join(MODEL_PATH, 'label_encoder.joblib'))
    feature_names = joblib.load(os.path.join(MODEL_PATH, 'feature_names.joblib'))
    base_model_xgb = joblib.load(os.path.join(MODEL_PATH, 'base_model_xgb_fold0.joblib'))
    base_model_lgb = joblib.load(os.path.join(MODEL_PATH, 'base_model_lgb_fold0.joblib'))
    base_model_cat = joblib.load(os.path.join(MODEL_PATH, 'base_model_cat_fold0.joblib'))
    print("✅ All model artifacts loaded successfully.")
except FileNotFoundError as e:
    print(f"❌ Error loading model files: {e}.")
    meta_model = None

# --- Feature Engineering Function ---
def get_features_for_star(star_name):
    print(f"Processing star: {star_name}...")
    lc = None
    try:
        search_result = lk.search_lightcurve(star_name, mission='K2', author='K2')
        if search_result: lc = search_result.download(quiet=True)
    except Exception: pass
    if lc is None:
        try:
            search_result = lk.search_lightcurve(star_name, mission='K2')
            if search_result: lc = search_result.download(quiet=True)
        except Exception: pass
    if lc is None:
        try:
            tpf_search = lk.search_targetpixelfile(star_name, mission='K2')
            if tpf_search:
                tpf = tpf_search.download(quiet=True)
                lc = tpf.to_lightcurve(method='pld')
        except Exception: return None, None
    
    if lc:
        processed_lc = lc.remove_nans().flatten(window_length=401).remove_outliers(sigma=5.0)
        if len(processed_lc) > 0:
            ts_df = pd.DataFrame({'id': star_name, 'time': processed_lc.time.value, 'flux': processed_lc.flux.value})
            extracted_features = extract_features(ts_df, column_id='id', column_sort='time', default_fc_parameters=MinimalFCParameters(), disable_progressbar=True, n_jobs=1)
            for col in feature_names:
                if col not in extracted_features.columns: extracted_features[col] = 0
            return extracted_features[feature_names], processed_lc
    return None, None

@app.route('/')
def home():
    """Renders the main HTML page."""
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if not meta_model:
        return jsonify({"error": "Model not loaded properly on the server."}), 500

    data = request.get_json()
    star_name = data.get('star_name')
    if not star_name: return jsonify({"error": "star_name is required."}), 400

    features_df, light_curve = get_features_for_star(star_name)
    if features_df is None or light_curve is None:
        return jsonify({"error": f"Could not find or process data for '{star_name}' in the archives."}), 404

    scaled_features = scaler.transform(features_df)
    scaled_features_df = pd.DataFrame(scaled_features, columns=feature_names)

    # Get base model predictions
    xgb_pred_proba = base_model_xgb.predict_proba(scaled_features_df)
    lgb_pred_proba = base_model_lgb.predict_proba(scaled_features_df)
    cat_pred_proba = base_model_cat.predict_proba(scaled_features_df)
    
    # NEW: Get the predicted label from each base model
    base_predictions = {
        "XGBoost": label_encoder.inverse_transform([np.argmax(xgb_pred_proba)])[0],
        "LightGBM": label_encoder.inverse_transform([np.argmax(lgb_pred_proba)])[0],
        "CatBoost": label_encoder.inverse_transform([np.argmax(cat_pred_proba)])[0],
    }

    meta_features = np.hstack([xgb_pred_proba, lgb_pred_proba, cat_pred_proba])
    
    final_prediction_proba = meta_model.predict_proba(meta_features)
    final_prediction_index = np.argmax(final_prediction_proba)
    final_prediction_label = label_encoder.inverse_transform([final_prediction_index])[0]

    periodogram = light_curve.to_periodogram(oversample_factor=10)
    best_fit_period = periodogram.period_at_max_power
    folded_lc = light_curve.fold(period=best_fit_period)
    light_curve_data = [{"x": t, "y": f} for t, f in zip(folded_lc.time.value, folded_lc.flux.value)]

    response = {
        "star_name": star_name,
        "prediction": final_prediction_label,
        "confidence_scores": dict(zip(label_encoder.classes_, final_prediction_proba[0])),
        "light_curve_data": light_curve_data,
        "base_model_predictions": base_predictions # NEW: Add base predictions to the response
    }
    return jsonify(response)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)