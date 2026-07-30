export type PermState =
  | { status: 'unknown' }
  | { status: 'granted' }
  | { status: 'missing' }
  | { status: 'requesting' }
  | { status: 'denied' };

export type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'success'; modelCount: number }
  | { status: 'error'; message: string };

export interface Preset {
  name: string;
  baseUrl: string;
  model: string;
}
