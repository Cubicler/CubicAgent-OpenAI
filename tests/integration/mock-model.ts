import type { JSONObject } from '@cubicler/cubicagentkit';

export interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  wind: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface FunctionParameterSchema {
  type: 'object';
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean';
  }>;
  required: string[];
}
export type MockFunctionResult = JSONObject | UserData | UserData[];
