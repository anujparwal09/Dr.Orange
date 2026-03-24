import tensorflow as tf
import os

src = 'dr-orange-model/orange_mtl_model.keras'
tgt = 'dr-orange-model/orange_mtl_model.h5'
print('Loading', src)
model = tf.keras.models.load_model(src, compile=False)
print('Saving', tgt)
if os.path.exists(tgt):
    os.remove(tgt)

# Save in H5 format with overwrite
tf.keras.models.save_model(model, tgt, overwrite=True, include_optimizer=False, save_format='h5')

backend_tgt = 'backend/model/orange_mtl_model.h5'
os.replace(tgt, backend_tgt)
print('Done, wrote', backend_tgt)
