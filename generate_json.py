import pandas as pd
import os

print("--- Generating JSON data for the infographic ---")

# File paths
cleaned_csv_path = 'data/cleaned_exoplanet_data.csv'
output_json_path = 'webapp/static/data/k2_data.json'
output_dir = os.path.dirname(output_json_path)

try:
    # Create the output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    df = pd.read_csv(cleaned_csv_path)
    print(f"✅ Successfully loaded {len(df)} records from '{cleaned_csv_path}'")
    
    # --- CORRECTED: Select only columns that are guaranteed to exist ---
    infographic_columns = [
        'pl_name', 
        'hostname', 
        'discoverymethod', 
        'disc_year', 
        'pl_rade', 
        'pl_orbper', 
        'st_teff', 
        'sy_pnum',
        'disc_facility',
        'st_mass', # Star Mass
        'st_rad'   # Star Radius
    ]
    
    # Ensure all required columns exist, fill with a default value if not
    for col in infographic_columns:
        if col not in df.columns:
            df[col] = 0 
            print(f"   - Warning: Column '{col}' not found. Filling with default value 0.")
            
    df_infographic = df[infographic_columns]
    
    # Convert the DataFrame to a JSON string and save
    json_data_string = df_infographic.to_json(orient='records')
    with open(output_json_path, 'w') as f:
        f.write(json_data_string)
        
    print(f"\n✨ Success! Rich infographic data has been saved to '{output_json_path}'")

except FileNotFoundError:
    print(f"❌ Error: Could not find the file at '{cleaned_csv_path}'. Please make sure the file exists in the 'data/' folder.")
except Exception as e:
    print(f"An unexpected error occurred: {e}")