import tensorflow as tf
import numpy as np
import os


class EdgeOptimizer:
    """Optimize models for edge deployment"""
    
    def __init__(self, model_dir="ml-pipeline/models/saved"):
        self.model_dir = model_dir
        self.tflite_dir = "ml-pipeline/models/tflite"
        os.makedirs(self.tflite_dir, exist_ok=True)
    
    def quantize_model(self, model_path, output_name, representative_dataset=None):
        """
        Convert model to quantized TFLite
        
        Args:
            model_path: Path to SavedModel or HDF5
            output_name: Name for output .tflite file
            representative_dataset: Generator for calibration data
        """
        converter = tf.lite.TFLiteConverter.from_saved_model(model_path)
        
        # Enable default optimizations
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        
        # Full integer quantization for smallest size
        if representative_dataset:
            converter.representative_dataset = representative_dataset
            converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
            converter.inference_input_type = tf.int8
            converter.inference_output_type = tf.int8
        
        # Convert
        tflite_model = converter.convert()
        
        # Save
        output_path = os.path.join(self.tflite_dir, f"{output_name}.tflite")
        with open(output_path, 'wb') as f:
            f.write(tflite_model)
        
        # Get model size
        size_kb = len(tflite_model) / 1024
        print(f"Quantized model saved: {output_path} ({size_kb:.1f} KB)")
        
        return output_path
    
    def dynamic_range_quantization(self, model_path, output_name):
        """Apply dynamic range quantization (simpler, no dataset needed)"""
        converter = tf.lite.TFLiteConverter.from_saved_model(model_path)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        
        tflite_model = converter.convert()
        
        output_path = os.path.join(self.tflite_dir, f"{output_name}_dynamic.tflite")
        with open(output_path, 'wb') as f:
            f.write(tflite_model)
        
        size_kb = len(tflite_model) / 1024
        print(f"Dynamic range quantized model: {output_path} ({size_kb:.1f} KB)")
        
        return output_path
    
    def float16_quantization(self, model_path, output_name):
        """Apply float16 quantization (good for GPU)"""
        converter = tf.lite.TFLiteConverter.from_saved_model(model_path)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_types = [tf.float16]
        
        tflite_model = converter.convert()
        
        output_path = os.path.join(self.tflite_dir, f"{output_name}_fp16.tflite")
        with open(output_path, 'wb') as f:
            f.write(tflite_model)
        
        size_kb = len(tflite_model) / 1024
        print(f"FP16 quantized model: {output_path} ({size_kb:.1f} KB)")
        
        return output_path
    
    def benchmark_model(self, model_path):
        """Benchmark TFLite model performance"""
        interpreter = tf.lite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()
        
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        
        # Get input shape
        input_shape = input_details[0]['shape']
        
        # Create random input
        input_data = np.array(np.random.random_sample(input_shape), dtype=np.float32)
        
        # Warmup
        for _ in range(10):
            interpreter.set_tensor(input_details[0]['index'], input_data)
            interpreter.invoke()
        
        # Benchmark
        import time
        num_runs = 100
        start = time.time()
        
        for _ in range(num_runs):
            interpreter.set_tensor(input_details[0]['index'], input_data)
            interpreter.invoke()
        
        elapsed = time.time() - start
        avg_latency = (elapsed / num_runs) * 1000  # ms
        
        print(f"\nBenchmark Results:")
        print(f"  Model: {model_path}")
        print(f"  Average latency: {avg_latency:.2f} ms")
        print(f"  Throughput: {1000/avg_latency:.1f} inferences/sec")
        
        return avg_latency
    
    def optimize_all_models(self):
        """Optimize all models for edge deployment"""
        models = {
            'speech_cnn_bilstm': 'speech_model',
            'facial_mobilenetv2': 'facial_model',
            'cognitive_transformer': 'cognitive_model',
            'fusion_attention': 'fusion_model'
        }
        
        results = {}
        
        for saved_name, output_name in models.items():
            model_path = os.path.join(self.model_dir, saved_name)
            
            if os.path.exists(model_path):
                print(f"\n{'='*50}")
                print(f"Optimizing: {saved_name}")
                print(f"{'='*50}")
                
                # Dynamic range quantization (default)
                tflite_path = self.dynamic_range_quantization(model_path, output_name)
                
                # Benchmark
                latency = self.benchmark_model(tflite_path)
                
                # Get file size
                size_bytes = os.path.getsize(tflite_path)
                size_mb = size_bytes / (1024 * 1024)
                
                results[output_name] = {
                    'path': tflite_path,
                    'size_mb': size_mb,
                    'latency_ms': latency
                }
            else:
                print(f"Model not found: {model_path}")
        
        # Print summary
        print(f"\n{'='*50}")
        print("OPTIMIZATION SUMMARY")
        print(f"{'='*50}")
        total_size = 0
        for name, result in results.items():
            print(f"{name}:")
            print(f"  Size: {result['size_mb']:.2f} MB")
            print(f"  Latency: {result['latency_ms']:.2f} ms")
            total_size += result['size_mb']
        print(f"\nTotal footprint: {total_size:.2f} MB")
        
        return results


def create_representative_dataset(model_type, num_samples=100):
    """Create representative dataset for calibration"""
    if model_type == 'speech':
        shape = (13, 300)
    elif model_type == 'facial':
        shape = (224, 224, 3)
    elif model_type == 'cognitive':
        shape = (5, 15)
    else:
        shape = (256,)
    
    def representative_dataset():
        for _ in range(num_samples):
            data = np.random.random_sample(shape).astype(np.float32)
            yield [data]
    
    return representative_dataset


if __name__ == "__main__":
    optimizer = EdgeOptimizer()
    results = optimizer.optimize_all_models()
