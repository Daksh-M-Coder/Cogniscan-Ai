import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import numpy as np


class SpeechModel:
    """CNN-BiLSTM for speech analysis"""
    
    @staticmethod
    def build_model(input_shape=(13, 300), num_classes=3):
        """
        Build CNN-BiLSTM model for speech biomarker detection
        
        Args:
            input_shape: (n_mfcc, n_frames) - default 13 MFCCs, 300 frames (~10s)
            num_classes: Number of output classes (3: normal, MCI, dementia)
        """
        inputs = keras.Input(shape=input_shape)
        
        # Reshape for Conv2D: (batch, n_mfcc, n_frames, 1)
        x = layers.Reshape((*input_shape, 1))(inputs)
        
        # CNN layers
        x = layers.Conv2D(32, kernel_size=3, padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling2D(pool_size=2)(x)
        
        x = layers.Conv2D(64, kernel_size=3, padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling2D(pool_size=2)(x)
        
        # Reshape for RNN: (batch, time, features)
        # Calculate new dimensions after pooling
        new_time = input_shape[1] // 4
        new_features = (input_shape[0] // 4) * 64
        x = layers.Reshape((new_time, new_features))(x)
        
        # BiLSTM layers
        x = layers.Bidirectional(layers.LSTM(128, return_sequences=True))(x)
        x = layers.Dropout(0.3)(x)
        x = layers.Bidirectional(layers.LSTM(64))(x)
        x = layers.Dropout(0.3)(x)
        
        # Dense layers
        x = layers.Dense(256, activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.5)(x)
        
        # Multi-task output
        embedding = layers.Dense(256, name='embedding')(x)
        
        # Classification head
        classification = layers.Dense(num_classes, activation='softmax', name='classification')(embedding)
        
        # Regression head (risk score)
        regression = layers.Dense(1, activation='sigmoid', name='regression')(embedding)
        
        model = keras.Model(inputs=inputs, outputs=[classification, regression, embedding])
        
        return model
    
    @staticmethod
    def compile_model(model, learning_rate=0.001):
        """Compile model with multi-task loss"""
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
            loss={
                'classification': 'sparse_categorical_crossentropy',
                'regression': 'mse'
            },
            loss_weights={
                'classification': 0.6,
                'regression': 0.4
            },
            metrics={
                'classification': ['accuracy'],
                'regression': ['mae']
            }
        )
        return model


class FacialModel:
    """MobileNetV2-based facial emotion and micro-expression model"""
    
    @staticmethod
    def build_model(input_shape=(224, 224, 3), num_classes=7, num_aus=17):
        """
        Build facial analysis model using MobileNetV2 backbone
        
        Args:
            input_shape: Input image shape (224x224 RGB)
            num_classes: Number of emotion classes
            num_aus: Number of Action Units to detect
        """
        inputs = keras.Input(shape=input_shape)
        
        # MobileNetV2 backbone (pretrained on ImageNet)
        backbone = keras.applications.MobileNetV2(
            input_shape=input_shape,
            include_top=False,
            weights='imagenet'
        )
        
        # Freeze early layers
        for layer in backbone.layers[:-20]:
            layer.trainable = False
        
        x = backbone(inputs)
        x = layers.GlobalAveragePooling2D()(x)
        x = layers.Dropout(0.5)(x)
        
        # Shared features
        shared = layers.Dense(256, activation='relu')(x)
        shared = layers.BatchNormalization()(shared)
        
        # Multi-task outputs
        embedding = layers.Dense(128, name='embedding')(shared)
        
        # Emotion classification
        emotion = layers.Dense(num_classes, activation='softmax', name='emotion')(embedding)
        
        # Valence-Arousal regression
        valence = layers.Dense(1, activation='tanh', name='valence')(embedding)
        arousal = layers.Dense(1, activation='tanh', name='arousal')(embedding)
        
        # Action Unit detection (multi-label)
        aus = layers.Dense(num_aus, activation='sigmoid', name='aus')(embedding)
        
        model = keras.Model(
            inputs=inputs,
            outputs=[emotion, valence, arousal, aus, embedding]
        )
        
        return model
    
    @staticmethod
    def compile_model(model, learning_rate=0.0001):
        """Compile with multi-task losses"""
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
            loss={
                'emotion': 'categorical_crossentropy',
                'valence': 'mse',
                'arousal': 'mse',
                'aus': 'binary_crossentropy'
            },
            loss_weights={
                'emotion': 0.4,
                'valence': 0.2,
                'arousal': 0.2,
                'aus': 0.2
            },
            metrics={
                'emotion': ['accuracy'],
                'valence': ['mae'],
                'arousal': ['mae'],
                'aus': ['accuracy']
            }
        )
        return model


class CognitiveTaskModel:
    """Transformer-based model for cognitive task performance"""
    
    @staticmethod
    def build_model(num_features=15, num_tasks=5, num_classes=3):
        """
        Build transformer model for cognitive task analysis
        
        Args:
            num_features: Number of engineered features per task
            num_tasks: Number of cognitive tasks
            num_classes: Output classes
        """
        inputs = keras.Input(shape=(num_tasks, num_features))
        
        # Feature embedding
        x = layers.Dense(64, activation='relu')(inputs)
        
        # Transformer encoder
        # Self-attention across tasks
        attention_output = layers.MultiHeadAttention(
            num_heads=4, key_dim=16
        )(x, x)
        
        # Add & Norm
        x = layers.Add()([x, attention_output])
        x = layers.LayerNormalization()(x)
        
        # Feed-forward
        ff_output = layers.Dense(128, activation='relu')(x)
        ff_output = layers.Dropout(0.1)(ff_output)
        ff_output = layers.Dense(64)(ff_output)
        
        # Add & Norm
        x = layers.Add()([x, ff_output])
        x = layers.LayerNormalization()(x)
        
        # Global pooling
        x = layers.GlobalAveragePooling1D()(x)
        
        # Dense layers
        x = layers.Dense(128, activation='relu')(x)
        x = layers.Dropout(0.3)(x)
        
        # Multi-task output
        embedding = layers.Dense(64, name='embedding')(x)
        
        classification = layers.Dense(num_classes, activation='softmax', name='classification')(embedding)
        regression = layers.Dense(1, activation='sigmoid', name='regression')(embedding)
        
        model = keras.Model(inputs=inputs, outputs=[classification, regression, embedding])
        
        return model
    
    @staticmethod
    def compile_model(model, learning_rate=0.001):
        """Compile model"""
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
            loss={
                'classification': 'sparse_categorical_crossentropy',
                'regression': 'mse'
            },
            loss_weights={
                'classification': 0.6,
                'regression': 0.4
            },
            metrics={
                'classification': ['accuracy'],
                'regression': ['mae']
            }
        )
        return model


class FusionModel:
    """Attention-based multimodal fusion model"""
    
    @staticmethod
    def build_model(
        speech_dim=256,
        facial_dim=128,
        cognitive_dim=64,
        temporal_dim=64,
        num_classes=3
    ):
        """
        Build attention-based fusion model
        
        Args:
            speech_dim: Speech embedding dimension
            facial_dim: Facial embedding dimension
            cognitive_dim: Cognitive embedding dimension
            temporal_dim: Temporal context dimension
            num_classes: Output classes
        """
        # Inputs
        speech_input = keras.Input(shape=(speech_dim,), name='speech')
        facial_input = keras.Input(shape=(facial_dim,), name='facial')
        cognitive_input = keras.Input(shape=(cognitive_dim,), name='cognitive')
        temporal_input = keras.Input(shape=(temporal_dim,), name='temporal')
        
        # Stack modalities: (batch, 4, dim)
        # First, project all to same dimension
        projection_dim = 128
        
        speech_proj = layers.Dense(projection_dim)(speech_input)
        facial_proj = layers.Dense(projection_dim)(facial_input)
        cognitive_proj = layers.Dense(projection_dim)(cognitive_input)
        temporal_proj = layers.Dense(projection_dim)(temporal_input)
        
        # Stack: (batch, 4, projection_dim)
        stacked = layers.Stack()([
            layers.Reshape((1, projection_dim))(speech_proj),
            layers.Reshape((1, projection_dim))(facial_proj),
            layers.Reshape((1, projection_dim))(cognitive_proj),
            layers.Reshape((1, projection_dim))(temporal_proj)
        ])
        
        # Multi-head self-attention
        attention = layers.MultiHeadAttention(
            num_heads=4,
            key_dim=32,
            dropout=0.1
        )(stacked, stacked)
        
        # Add & Norm
        x = layers.Add()([stacked, attention])
        x = layers.LayerNormalization()(x)
        
        # Feed-forward
        ff = layers.Dense(256, activation='relu')(x)
        ff = layers.Dropout(0.1)(ff)
        ff = layers.Dense(projection_dim)(ff)
        
        # Add & Norm
        x = layers.Add()([x, ff])
        x = layers.LayerNormalization()(x)
        
        # Global average pooling over modalities
        x = layers.GlobalAveragePooling1D()(x)
        
        # FFN
        x = layers.Dense(256, activation='relu')(x)
        x = layers.Dropout(0.3)(x)
        x = layers.Dense(128, activation='relu')(x)
        x = layers.Dropout(0.3)(x)
        x = layers.Dense(64, activation='relu')(x)
        x = layers.Dense(16, activation='relu')(x)
        
        # Outputs
        classification = layers.Dense(num_classes, activation='softmax', name='classification')(x)
        regression = layers.Dense(1, activation='sigmoid', name='regression')(x)
        
        model = keras.Model(
            inputs=[speech_input, facial_input, cognitive_input, temporal_input],
            outputs=[classification, regression]
        )
        
        return model
    
    @staticmethod
    def compile_model(model, learning_rate=0.001):
        """Compile fusion model"""
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
            loss={
                'classification': 'sparse_categorical_crossentropy',
                'regression': 'mse'
            },
            loss_weights={
                'classification': 0.6,
                'regression': 0.4
            },
            metrics={
                'classification': ['accuracy'],
                'regression': ['mae']
            }
        )
        return model


def create_all_models():
    """Create all model architectures"""
    models = {
        'speech': SpeechModel.build_model(),
        'facial': FacialModel.build_model(),
        'cognitive': CognitiveTaskModel.build_model(),
        'fusion': FusionModel.build_model()
    }
    
    for name, model in models.items():
        print(f"\n{name.upper()} Model:")
        model.summary()
    
    return models


if __name__ == "__main__":
    # Test model creation
    models = create_all_models()
