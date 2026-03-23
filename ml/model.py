import tensorflow as tf

def build_mtl_model(num_disease_classes=6, img_size=224) -> tf.keras.Model:
    inputs = tf.keras.Input(shape=(img_size, img_size, 3), name='image_input')

    # Backbone
    backbone = tf.keras.applications.MobileNetV2(
        weights='imagenet',
        include_top=False,
        input_shape=(img_size, img_size, 3)
    )
    backbone.trainable = False
    x = backbone(inputs, training=False)

    # Shared feature extractor
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dense(512, activation='relu',
                               kernel_regularizer=tf.keras.regularizers.l2(1e-4))(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.Dropout(0.35)(x)
    
    x = tf.keras.layers.Dense(256, activation='relu',
                               kernel_regularizer=tf.keras.regularizers.l2(1e-4))(x)
    x = tf.keras.layers.BatchNormalization()(x)
    shared = tf.keras.layers.Dropout(0.25)(x)

    # HEAD 1 — DISEASE CLASSIFICATION
    d = tf.keras.layers.Dense(128, activation='relu')(shared)
    d = tf.keras.layers.Dropout(0.2)(d)
    disease_out = tf.keras.layers.Dense(
        num_disease_classes, activation='softmax', name='disease'
    )(d)

    # HEAD 2 — QUALITY SCORE
    q = tf.keras.layers.Dense(64, activation='relu')(shared)
    q = tf.keras.layers.Dropout(0.15)(q)
    quality_out = tf.keras.layers.Dense(
        1, activation='sigmoid', name='quality_score'
    )(q)

    # HEAD 3 — SHELF LIFE
    s = tf.keras.layers.Dense(64, activation='relu')(shared)
    s = tf.keras.layers.Dropout(0.15)(s)
    shelf_out = tf.keras.layers.Dense(
        1, activation='sigmoid', name='shelf_life'
    )(s)

    # HEAD 4 — RIPENESS STAGE
    r = tf.keras.layers.Dense(64, activation='relu')(shared)
    r = tf.keras.layers.Dropout(0.15)(r)
    ripeness_out = tf.keras.layers.Dense(
        4, activation='softmax', name='ripeness'
    )(r)

    # Build model
    model = tf.keras.Model(
        inputs=inputs,
        outputs={
            'disease': disease_out,
            'quality_score': quality_out,
            'shelf_life': shelf_out,
            'ripeness': ripeness_out
        },
        name='dr_orange_mtl'
    )
    return model

def compile_model(model) -> None:
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss={
            'disease': 'categorical_crossentropy',
            'quality_score': 'mse',
            'shelf_life': 'mse',
            'ripeness': 'categorical_crossentropy'
        },
        loss_weights={
            'disease': 1.0,
            'quality_score': 0.5,
            'shelf_life': 0.3,
            'ripeness': 0.7
        },
        metrics={
            'disease': ['accuracy', tf.keras.metrics.AUC(name='auc')],
            'quality_score': ['mae'],
            'shelf_life': ['mae'],
            'ripeness': ['accuracy']
        }
    )

def get_callbacks(save_path='orange_mtl_model.h5') -> list:
    return [
        tf.keras.callbacks.ModelCheckpoint(
            filepath=save_path,
            monitor='val_disease_accuracy',
            save_best_only=True,
            mode='max',
            verbose=1
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor='val_disease_accuracy',
            patience=7,
            restore_best_weights=True,
            verbose=1
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.4,
            patience=3,
            min_lr=1e-7,
            verbose=1
        ),
        tf.keras.callbacks.CSVLogger('training_log.csv'),
        tf.keras.callbacks.TensorBoard(log_dir='./logs')
    ]
