import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
import tensorflow as tf

DISEASE_CLASSES = [
    'Healthy', 'Citrus_Canker', 'Black_Spot',
    'Nutrient_Deficiency', 'Multiple_Diseases', 'Rotten'
]
RIPENESS_CLASSES = ['Unripe', 'Near_Ripe', 'Ripe', 'Overripe']

def plot_training_curves(history1, history2=None):
    if history2:
        acc = history1.history['disease_accuracy'] + history2.history['disease_accuracy']
        val_acc = history1.history['val_disease_accuracy'] + history2.history['val_disease_accuracy']
        loss = history1.history['loss'] + history2.history['loss']
        val_loss = history1.history['val_loss'] + history2.history['val_loss']
        q_mae = history1.history['quality_score_mae'] + history2.history['quality_score_mae']
        val_q_mae = history1.history['val_quality_score_mae'] + history2.history['val_quality_score_mae']
        r_acc = history1.history['ripeness_accuracy'] + history2.history['ripeness_accuracy']
        val_r_acc = history1.history['val_ripeness_accuracy'] + history2.history['val_ripeness_accuracy']
    else:
        acc = history1.history['disease_accuracy']
        val_acc = history1.history['val_disease_accuracy']
        loss = history1.history['loss']
        val_loss = history1.history['val_loss']
        q_mae = history1.history['quality_score_mae']
        val_q_mae = history1.history['val_quality_score_mae']
        r_acc = history1.history['ripeness_accuracy']
        val_r_acc = history1.history['val_ripeness_accuracy']

    epochs = range(1, len(acc) + 1)
    
    plt.figure(figsize=(15, 10))

    # Plot 1: Disease Accuracy
    plt.subplot(2, 2, 1)
    plt.plot(epochs, acc, 'b-', label='Training Acc')
    plt.plot(epochs, val_acc, 'r-', label='Validation Acc')
    if history2:
        plt.axvline(len(history1.history['loss']), color='k', linestyle='--', label='Phase 2 start')
    plt.title('Disease Classification Accuracy')
    plt.legend()

    # Plot 2: Total Loss
    plt.subplot(2, 2, 2)
    plt.plot(epochs, loss, 'b-', label='Training Loss')
    plt.plot(epochs, val_loss, 'r-', label='Validation Loss')
    if history2:
        plt.axvline(len(history1.history['loss']), color='k', linestyle='--', label='Phase 2 start')
    plt.title('Total Multi-Task Loss')
    plt.legend()

    # Plot 3: Quality MAE
    plt.subplot(2, 2, 3)
    plt.plot(epochs, q_mae, 'b-', label='Training MAE')
    plt.plot(epochs, val_q_mae, 'r-', label='Validation MAE')
    if history2:
        plt.axvline(len(history1.history['loss']), color='k', linestyle='--', label='Phase 2 start')
    plt.title('Quality Score MAE')
    plt.legend()

    # Plot 4: Ripeness Accuracy
    plt.subplot(2, 2, 4)
    plt.plot(epochs, r_acc, 'b-', label='Training Acc')
    plt.plot(epochs, val_r_acc, 'r-', label='Validation Acc')
    if history2:
        plt.axvline(len(history1.history['loss']), color='k', linestyle='--', label='Phase 2 start')
    plt.title('Ripeness Classification Accuracy')
    plt.legend()

    plt.tight_layout()
    plt.savefig('training_curves.png')
    plt.close()

def plot_confusion_matrix(model, val_ds, val_df):
    y_true = []
    y_pred = []

    for images, labels in val_ds:
        preds = model.predict(images, verbose=0)
        
        disease_preds = preds['disease'] if isinstance(preds, dict) else preds[0]
        disease_labels = labels['disease']
        
        y_pred.extend(np.argmax(disease_preds, axis=1))
        y_true.extend(np.argmax(disease_labels.numpy(), axis=1))

    cm = confusion_matrix(y_true, y_pred)
    
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=DISEASE_CLASSES, yticklabels=DISEASE_CLASSES)
    plt.title('Disease Classification Confusion Matrix')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig('confusion_matrix.png')
    plt.close()

def print_classification_report(model, val_ds, val_df):
    y_true = []
    y_pred = []

    for images, labels in val_ds:
        preds = model.predict(images, verbose=0)
        
        disease_preds = preds['disease'] if isinstance(preds, dict) else preds[0]
        disease_labels = labels['disease']
        
        y_pred.extend(np.argmax(disease_preds, axis=1))
        y_true.extend(np.argmax(disease_labels.numpy(), axis=1))

    print("\n--- Disease Classification Report ---")
    print(classification_report(y_true, y_pred, target_names=DISEASE_CLASSES, labels=np.arange(len(DISEASE_CLASSES))))

def show_sample_predictions(model, val_df, num_samples=5):
    from inference import predict_local
    
    samples = val_df.sample(num_samples)
    plt.figure(figsize=(20, 4 * num_samples))
    
    for i, (_, row) in enumerate(samples.iterrows()):
        image_path = row['image_path']
        img = tf.keras.preprocessing.image.load_img(image_path, target_size=(224, 224))
        
        result = predict_local(image_path, model)
        
        plt.subplot(num_samples, 2, i*2 + 1)
        plt.imshow(img)
        plt.title('Input Image')
        plt.axis('off')
        
        plt.subplot(num_samples, 2, i*2 + 2)
        plt.axis('off')
        
        text = f"True Disease: {row['disease_class']}\n\n"
        text += f"Pred Disease: {result['disease']} ({result['disease_confidence']*100:.1f}%)\n"
        text += f"Pred Quality: {result['quality_score']}/10.0\n"
        text += f"Pred Shelf Life: {result['shelf_life_days']} days\n"
        text += f"Pred Ripeness: {result['ripeness_stage']}"
        
        plt.text(0.1, 0.5, text, fontsize=12, verticalalignment='center')
        
    plt.tight_layout()
    plt.savefig('sample_predictions.png')
    plt.close()
