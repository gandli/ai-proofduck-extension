/**
 * WebGPU Navigator 类型扩展
 */
interface Navigator {
  readonly gpu?: GPU;
}

/**
 * GPU 类型定义
 */
interface GPU {
  requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
}

interface GPURequestAdapterOptions {
  powerPreference?: GPUPowerPreference;
  forceFallbackAdapter?: boolean;
}

type GPUPowerPreference = 'low-power' | 'high-performance' | 'default';

/**
 * GPUAdapter 类型定义
 */
interface GPUAdapter {
  readonly name?: string;
  readonly features: GPUFeatureSet;
  readonly limits: GPUSupportedLimits;
  requestDevice(options?: GPUDeviceDescriptor): Promise<GPUDevice>;
}

/**
 * GPUFeatureSet 类型定义
 */
interface GPUFeatureSet {
  has(f: string): boolean;
  [index: string]: boolean | ((f: string) => boolean);
}

/**
 * GPUSupportedLimits 类型定义
 */
interface GPUSupportedLimits {
  maxTextureDimension1D: number;
  maxTextureDimension2D: number;
  maxTextureDimension3D: number;
  maxTextureArrayLayers: number;
  maxBindGroups: number;
  maxBindingsPerBindGroup: number;
  maxDynamicStorageBuffersPerPipelineLayout: number;
  maxDynamicUniformBuffersPerPipelineLayout: number;
  maxSamplersPerPipelineLayout: number;
  maxStorageBuffersPerPipelineLayout: number;
  maxStorageTexturesPerPipelineLayout: number;
  maxUniformBuffersPerPipelineLayout: number;
  maxUniformBufferBindingSize: number;
  maxStorageBufferBindingSize: number;
  minUniformBufferOffsetAlignment: number;
  minStorageBufferOffsetAlignment: number;
}

/**
 * GPUDeviceDescriptor 类型定义
 */
interface GPUDeviceDescriptor extends GPURequiredLimits {
  label?: string;
  requiredFeatures?: GPUFeatureName[];
  requiredLimits?: Record<string, number>;
}

/**
 * GPUFeatureName 类型定义
 */
type GPUFeatureName =
  | 'depth-clip-control'
  | 'depth32float-stencil8'
  | 'float32-filterable'
  | 'texture-compression-bc'
  | 'texture-compression-etc2'
  | 'texture-compression-astc'
  | 'timestamp-query'
  | 'indirect-first-instance'
  | 'shader-f16'
  | 'rg11b10ufloat-renderable'
  | 'bgra8unorm-storage'
  | 'float32-luma-width'
  | 'norm16-surface-formats';

/**
 * GPURequiredLimits 类型定义
 */
interface GPURequiredLimits {
  maxTextureDimension1D?: number;
  maxTextureDimension2D?: number;
  maxTextureDimension3D?: number;
  maxTextureArrayLayers?: number;
  maxBindGroups?: number;
  maxBindingsPerBindGroup?: number;
  maxDynamicStorageBuffersPerPipelineLayout?: number;
  maxDynamicUniformBuffersPerPipelineLayout?: number;
  maxSamplersPerPipelineLayout?: number;
  maxStorageBuffersPerPipelineLayout?: number;
  maxStorageTexturesPerPipelineLayout?: number;
  maxUniformBuffersPerPipelineLayout?: number;
  maxUniformBufferBindingSize?: number;
  maxStorageBufferBindingSize?: number;
  minUniformBufferOffsetAlignment?: number;
  minStorageBufferOffsetAlignment?: number;
}

/**
 * GPUDevice 类型定义
 */
interface GPUDevice extends GPUDeviceBase {
  readonly adapter: GPUAdapter;
}

/**
 * GPUDeviceBase 类型定义
 */
interface GPUDeviceBase {
  readonly features: GPUFeatureSet;
  readonly limits: GPUSupportedLimits;
  readonly queue: GPUQueue;
  destroy(): void;
}

/**
 * GPUQueue 类型定义
 */
interface GPUQueue {
  submit(commands: GPUCommandBuffer[]): void;
  signal(fence: GPUFence, value: number): void;
  wait(fence: GPUFence, value: number, timeout?: number): Promise<void>;
}

/**
 * GPUCommandBuffer 类型定义
 */
interface GPUCommandBuffer {
  readonly status: GPUCommandBufferStatus;
  getCommandBuffer(): GPUCommandBuffer;
}

/**
 * GPUCommandBufferStatus 类型定义
 */
type GPUCommandBufferStatus = 'valid' | 'error';

/**
 * GPUFence 类型定义
 */
interface GPUFence {
  readonly status: GPUFenceStatus;
}

/**
 * GPUFenceStatus 类型定义
 */
type GPUFenceStatus = 'signaled' | 'unsignaled';
