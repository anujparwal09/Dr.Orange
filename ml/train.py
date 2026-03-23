# ==============================
# IMPORTS
# ==============================
import tensorflow as tf
import numpy as np
import pandas as pd
import os
import warnings
from sklearn.model_selection import train_test_split

warnings.filterwarnings('ignore')

print(f"TF version: {tf.__version__}")
print(f"GPU: {tf.config.list_physical_devices('GPU')}")

# ==============================
# CONFIG
# ==============================
DATASET_ROOT = '../Ornage disease dataset'
QUALITY_CSV  = '../Ornage disease dataset/csv file/Orange Quality Data.csv'
CITRUS_CSV   = '../Ornage disease dataset/csv file/citrus.csv'

MODEL_SAVE = "orange_mtl_model.keras"

IMG_SIZE   = 224
BATCH_SIZE = 32

# ==============================
# IMPORT YOUR MODULES
# ==============================
from data_loader import load_csv_stats, scan_dataset, build_tf_dataset, DISEASE_CLASSES
from model import build_mtl_model, compile_model
from inference import get_full_prediction

# ==============================
# CALLBACKS — defined here directly so mode='max' is explicit
# ==============================
def get_callbacks(model_save_path):
    return [
        tf.keras.callbacks.EarlyStopping(
            monitor='val_disease_accuracy',
            patience=5,
            mode='max',                  # ← FIX: higher accuracy = better
            restore_best_weights=True,
            verbose=1
        ),
        tf.keras.callbacks.ModelCheckpoint(
            filepath=model_save_path,
            monitor='val_disease_accuracy',
            mode='max',                  # ← FIX: higher accuracy = better
            save_best_only=True,
            verbose=1
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            mode='min',                  # loss → lower is better
            min_lr=1e-7,
            verbose=1
        ),
        tf.keras.callbacks.CSVLogger(
            'training_log.csv',
            append=True
        )
    ]

# ==============================
# LOAD DATA
# ==============================
print("\n🔹 Loading CSV stats...")
csv_stats = load_csv_stats(QUALITY_CSV, CITRUS_CSV)
print("CSV stats loaded:", csv_stats)

print("\n🔹 Scanning dataset...")
df = scan_dataset(DATASET_ROOT, csv_stats)

if df.empty:
    print("❌ No images found in dataset!")
    exit()

print(f"\nTotal images: {len(df)}")
print("\nClass distribution:")
print(df['disease_class'].value_counts())

# ==============================
# TRAIN / VALID SPLIT
# ==============================
train_df, val_df = train_test_split(
    df,
    test_size=0.2,
    stratify=df['disease_class'],
    random_state=42
)

print(f"\nTrain: {len(train_df)} | Val: {len(val_df)}")

train_ds = build_tf_dataset(train_df, IMG_SIZE, BATCH_SIZE, augment=True)
val_ds   = build_tf_dataset(val_df,   IMG_SIZE, BATCH_SIZE, augment=False)

# ==============================
# BUILD MODEL
# ==============================
print("\n🔹 Building model...")
model = build_mtl_model(num_disease_classes=len(DISEASE_CLASSES))
compile_model(model)
model.summary()

# ==============================
# PHASE 1 — Frozen backbone (epochs 1–20)
# ==============================
print("\n🚀 PHASE 1: Training with frozen backbone...")

history1 = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=20,
    callbacks=get_callbacks(MODEL_SAVE),
    verbose=1
)

print(f"\n✅ Phase 1 done.")
print(f"   Best val_disease_accuracy: {max(history1.history['val_disease_accuracy']):.4f}")

# ==============================
# PHASE 2 — Fine-tune top 30 backbone layers (epochs 21–40)
# ==============================
print("\n🚀 PHASE 2: Fine-tuning top 30 backbone layers...")

backbone = model.get_layer('mobilenetv2_1.00_224')
backbone.trainable = True

# Freeze all layers EXCEPT the last 30
for layer in backbone.layers[:-30]:
    layer.trainable = False

trainable_count = sum(1 for l in backbone.layers if l.trainable)
print(f"   Backbone trainable layers: {trainable_count} / {len(backbone.layers)}")

# Recompile with lower learning rate for fine-tuning
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
    loss={
        'disease':      'categorical_crossentropy',
        'quality_score': 'mse',
        'shelf_life':    'mse',
        'ripeness':      'categorical_crossentropy'
    },
    loss_weights={
        'disease':       1.0,
        'quality_score': 0.5,
        'shelf_life':    0.3,
        'ripeness':      0.7
    },
    metrics={
        'disease':       ['accuracy'],
        'quality_score': ['mae'],
        'shelf_life':    ['mae'],
        'ripeness':      ['accuracy']
    }
)

history2 = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=40,
    initial_epoch=20,
    callbacks=get_callbacks(MODEL_SAVE),
    verbose=1
)

print(f"\n✅ Phase 2 done.")
print(f"   Best val_disease_accuracy: {max(history2.history['val_disease_accuracy']):.4f}")

# ==============================
# FINAL SAVE
# ==============================
print("\n💾 Saving final model...")
model.save(MODEL_SAVE)

if os.path.exists(MODEL_SAVE):
    size_mb = os.path.getsize(MODEL_SAVE) / (1024 * 1024)
    print(f"✅ Model saved: {MODEL_SAVE} ({size_mb:.2f} MB)")
else:
    print("❌ Model save failed — check disk space / path")

# ==============================
# VERIFY — reload and run one test prediction
# ==============================
print("\n🔍 Verifying saved model...")

loaded_model = tf.keras.models.load_model(MODEL_SAVE)
print("✅ Model reloaded successfully")

sample_path = val_df.sample(1)['image_path'].values[0]
print(f"\nTest image: {sample_path}")

result = get_full_prediction(sample_path, loaded_model)

print("\n" + "="*45)
print("         TEST PREDICTION RESULT")
print("="*45)
print(f"  Disease    : {result['disease']}")
print(f"  Confidence : {result['disease_confidence']*100:.2f}%")
print(f"  Quality    : {result['quality_score']}/10")
print(f"  Shelf Life : {result['shelf_life_days']} days")
print(f"  Ripeness   : {result['ripeness_stage']}")
print("="*45)

# ==============================
# TRAINING SUMMARY
# ==============================
print("\n📊 TRAINING SUMMARY")
print("-"*45)

p1_acc = history1.history.get('val_disease_accuracy', [0])
p2_acc = history2.history.get('val_disease_accuracy', [0])
all_acc = p1_acc + p2_acc

print(f"  Phase 1 peak accuracy  : {max(p1_acc):.4f}")
print(f"  Phase 2 peak accuracy  : {max(p2_acc):.4f}")
print(f"  Overall best accuracy  : {max(all_acc):.4f}")
print(f"  Total epochs trained   : {len(all_acc)}")
print(f"  Model file             : {MODEL_SAVE}")
print(f"  Training log           : training_log.csv")
print("-"*45)
print("\n🎉 TRAINING COMPLETE — ready for Flask backend!")