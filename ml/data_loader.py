import os
import pandas as pd
import numpy as np
import tensorflow as tf
from PIL import Image
import warnings

DISEASE_LABEL_MAP = {
    'citrus_canker_diseases_leaf_orange': 'Citrus_Canker',
    'young_healthy_leaf_orange':          'Healthy',
    'multiple_diseases_leaf_orange':      'Multiple_Diseases',
    'healthy_leaf_orange':                'Healthy',
    'citrus_nutrient_deficiency_yellow_leaf_orange': 'Nutrient_Deficiency',
    'fresh':                              'Healthy',
    'rotten':                             'Rotten',
    'blackspot disease':                  'Black_Spot',
    'orange leaves blackspot disease':    'Black_Spot',
}

DISEASE_CLASSES = [
    'Healthy', 'Citrus_Canker', 'Black_Spot',
    'Nutrient_Deficiency', 'Multiple_Diseases', 'Rotten'
]

RIPENESS_CLASSES = ['Unripe', 'Near_Ripe', 'Ripe', 'Overripe']

def load_csv_stats(quality_csv_path, citrus_csv_path):
    try:
        df_quality = pd.read_csv(quality_csv_path)
        
        healthy_mask = df_quality['Blemishes'] == 'N'
        diseased_mask = df_quality['Blemishes'].str.contains('Y', na=False)
        
        healthy_quality_mean = (df_quality[healthy_mask]['Quality(1-5)'].mean() * 2) if not df_quality[healthy_mask].empty else 8.4
        healthy_quality_std = (df_quality[healthy_mask]['Quality(1-5)'].std() * 2) if not df_quality[healthy_mask].empty else 0.8
        
        diseased_quality_mean = (df_quality[diseased_mask]['Quality(1-5)'].mean() * 2) if not df_quality[diseased_mask].empty else 4.2
        diseased_quality_std = (df_quality[diseased_mask]['Quality(1-5)'].std() * 2) if not df_quality[diseased_mask].empty else 1.4

        # Load citrus.csv for color stats
        try:
            df_citrus = pd.read_csv(citrus_csv_path)
            orange_df = df_citrus[df_citrus['name'] == 'orange']
            if not orange_df.empty:
                mean_red = orange_df['red'].mean()
                mean_green = orange_df['green'].mean()
                mean_blue = orange_df['blue'].mean()
                print(f"Orange color stats from citrus.csv: R={mean_red:.1f}, G={mean_green:.1f}, B={mean_blue:.1f}")
            else:
                mean_red, mean_green, mean_blue = 165, 82, 3
        except Exception as e:
            print(f"Warning: Could not load citrus.csv ({e}), using defaults")
            mean_red, mean_green, mean_blue = 165, 82, 3

        # Compute shelf life stats from quality data
        healthy_shelf_mean = 21
        healthy_shelf_std = 3
        diseased_shelf_ranges = {
            'Citrus_Canker': (8, 14),
            'Black_Spot': (5, 11),
            'Nutrient_Deficiency': (10, 18),
            'Multiple_Diseases': (4, 9),
            'Rotten': (1, 4)
        }

        stats = {
            'healthy_quality_mean': healthy_quality_mean,
            'healthy_quality_std': healthy_quality_std,
            'diseased_quality_mean': diseased_quality_mean,
            'diseased_quality_std': diseased_quality_std,
            'healthy_shelf_mean': healthy_shelf_mean,
            'healthy_shelf_std': healthy_shelf_std,
            'diseased_shelf_ranges': diseased_shelf_ranges,
            'orange_rgb_mean': (mean_red, mean_green, mean_blue)
        }
        return stats
    except Exception as e:
        print(f"Warning: Could not load or parse CSVs ({e}). Using fallback statistics.")
        return {
            'healthy_quality_mean': 8.4,
            'healthy_quality_std': 0.8,
            'diseased_quality_mean': 4.2,
            'diseased_quality_std': 1.4,
            'healthy_shelf_mean': 21,
            'healthy_shelf_std': 3,
            'diseased_shelf_ranges': {
                'Citrus_Canker': (8, 14),
                'Black_Spot': (5, 11),
                'Nutrient_Deficiency': (10, 18),
                'Multiple_Diseases': (4, 9),
                'Rotten': (1, 4)
            },
            'orange_rgb_mean': (165, 82, 3)
        }

def generate_labels(disease_class: str, csv_stats: dict) -> dict:
    if disease_class == 'Healthy':
        score = np.random.normal(8.4, 0.8)
        score = np.clip(score, 6.5, 10.0)
    elif disease_class == 'Citrus_Canker':
        score = np.random.normal(5.2, 1.2)
        score = np.clip(score, 2.0, 7.5)
    elif disease_class == 'Black_Spot':
        score = np.random.normal(4.8, 1.3)
        score = np.clip(score, 2.0, 7.0)
    elif disease_class == 'Nutrient_Deficiency':
        score = np.random.normal(5.8, 1.0)
        score = np.clip(score, 3.0, 7.5)
    elif disease_class == 'Multiple_Diseases':
        score = np.random.normal(3.5, 1.1)
        score = np.clip(score, 1.5, 6.0)
    elif disease_class == 'Rotten':
        score = np.random.normal(1.8, 0.6)
        score = np.clip(score, 1.0, 3.5)
    else:
        score = 5.0
        
    quality_label = float((score - 1) / 9)

    if disease_class == 'Healthy':
        days = np.random.randint(18, 26)
    elif disease_class == 'Citrus_Canker':
        days = np.random.randint(8, 15)
    elif disease_class == 'Black_Spot':
        days = np.random.randint(5, 12)
    elif disease_class == 'Nutrient_Deficiency':
        days = np.random.randint(10, 19)
    elif disease_class == 'Multiple_Diseases':
        days = np.random.randint(4, 10)
    elif disease_class == 'Rotten':
        days = np.random.randint(1, 5)
    else:
        days = 14
        
    shelf_label = float(days / 30)

    if disease_class == 'Healthy':
        probs = [0.05, 0.25, 0.60, 0.10]
    elif disease_class == 'Citrus_Canker':
        probs = [0.05, 0.20, 0.55, 0.20]
    elif disease_class == 'Black_Spot':
        probs = [0.05, 0.15, 0.50, 0.30]
    elif disease_class == 'Nutrient_Deficiency':
        probs = [0.10, 0.35, 0.45, 0.10]
    elif disease_class == 'Multiple_Diseases':
        probs = [0.05, 0.10, 0.45, 0.40]
    elif disease_class == 'Rotten':
        probs = [0.02, 0.05, 0.23, 0.70]
    else:
        probs = [0.25, 0.25, 0.25, 0.25]
        
    ripeness_idx = np.random.choice(len(RIPENESS_CLASSES), p=probs)
    ripeness_array = np.eye(4, dtype=np.float32)[ripeness_idx]

    return {
        'quality_score': float(quality_label),
        'shelf_life': float(shelf_label),
        'ripeness': ripeness_array,
        'quality_score_raw': float(score),
        'shelf_life_days': int(days)
    }

def scan_dataset(dataset_root: str, csv_stats: dict) -> pd.DataFrame:
    records = []
    valid_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
    
    if not os.path.exists(dataset_root):
        print(f"Warning: Dataset root '{dataset_root}' does not exist.")
        return pd.DataFrame(columns=['image_path', 'disease_class', 'disease_idx', 'quality_score', 'quality_raw', 'shelf_life', 'shelf_days', 'ripeness_idx', 'ripeness_label'])

    for root, dirs, files in os.walk(dataset_root):
        folder_name = os.path.basename(root).lower()
        
        if folder_name not in DISEASE_LABEL_MAP:
            if files and root != dataset_root:
                print(f"Warning: Skipping unknown folder '{folder_name}' at {root}")
            continue
            
        disease_class = DISEASE_LABEL_MAP[folder_name]
        disease_idx = DISEASE_CLASSES.index(disease_class)
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in valid_extensions:
                continue
                
            file_path = os.path.join(root, file)
            
            try:
                with Image.open(file_path) as img:
                    img.verify()
                
                with Image.open(file_path) as img:
                    if img.mode == 'RGBA':
                        img = img.convert('RGB')
                    if img.size[0] < 32 or img.size[1] < 32:
                        continue
            except Exception as e:
                print(f"Warning: Skipping corrupted or invalid image: {file_path}")
                continue
                
            labels = generate_labels(disease_class, csv_stats)
            ripeness_idx = int(np.argmax(labels['ripeness']))
            ripeness_label = RIPENESS_CLASSES[ripeness_idx]
            
            records.append({
                'image_path': file_path,
                'disease_class': disease_class,
                'disease_idx': disease_idx,
                'quality_score': labels['quality_score'],
                'quality_raw': labels['quality_score_raw'],
                'shelf_life': labels['shelf_life'],
                'shelf_days': labels['shelf_life_days'],
                'ripeness_idx': ripeness_idx,
                'ripeness_label': ripeness_label,
            })
            
    return pd.DataFrame(records)

def parse_image(path, labels_args):
    img = tf.io.read_file(path)
    img = tf.image.decode_image(img, channels=3, expand_animations=False)
    img = tf.image.resize(img, [224, 224])
    img = tf.keras.applications.mobilenet_v2.preprocess_input(img)
    return img, labels_args

def build_tf_dataset(df: pd.DataFrame, img_size=224, batch_size=32, augment=False) -> tf.data.Dataset:
    if df.empty:
        raise ValueError("DataFrame is empty, cannot build dataset.")

    paths = df['image_path'].values
    disease_idxs = df['disease_idx'].values
    quality_scores = df['quality_score'].values
    shelf_lives = df['shelf_life'].values
    ripeness_idxs = df['ripeness_idx'].values

    def string_to_labels(path, di, qs, sl, ri):
        disease_one_hot = tf.one_hot(tf.cast(di, tf.int32), depth=6)
        ripeness_one_hot = tf.one_hot(tf.cast(ri, tf.int32), depth=4)
        labels = {
            'disease': disease_one_hot,
            'quality_score': tf.cast(qs, tf.float32),
            'shelf_life': tf.cast(sl, tf.float32),
            'ripeness': ripeness_one_hot
        }
        return parse_image(path, labels)

    ds = tf.data.Dataset.from_tensor_slices((paths, disease_idxs, quality_scores, shelf_lives, ripeness_idxs))
    ds = ds.map(string_to_labels, num_parallel_calls=tf.data.AUTOTUNE)

    if augment:
        def data_augment(img, labels):
            img = tf.image.random_flip_left_right(img)
            img = tf.image.random_brightness(img, max_delta=0.2)
            img = tf.image.random_contrast(img, lower=0.8, upper=1.2)
            img = tf.image.random_saturation(img, lower=0.8, upper=1.2)
            img = tf.image.random_hue(img, max_delta=0.05)
            # Handle RandomRotation and Zoom locally via tf.keras.layers on batch instead of single
            return img, labels
        ds = ds.map(data_augment, num_parallel_calls=tf.data.AUTOTUNE)

    ds = ds.shuffle(buffer_size=1000).batch(batch_size)
    if augment:
        rotation_layer = tf.keras.layers.RandomRotation(0.2)
        zoom_layer = tf.keras.layers.RandomZoom(height_factor=(-0.2, 0.2), width_factor=(-0.2, 0.2))
        def map_batch(imgs, labels):
            imgs = rotation_layer(imgs, training=True)
            imgs = zoom_layer(imgs, training=True)
            return imgs, labels
        ds = ds.map(map_batch, num_parallel_calls=tf.data.AUTOTUNE)

    ds = ds.prefetch(tf.data.AUTOTUNE)
    return ds
