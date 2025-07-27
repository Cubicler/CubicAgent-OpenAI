import express from 'express';
import type { Server } from 'http';
import type { ProviderInfo, ProviderSpecResponse, JSONObject } from '@cubicler/cubicagentkit';
import { FunctionParameterSchema, MockFunctionResult, WeatherData, UserData } from './mock-model';

/**
 * Mock Cubicler Server
 * Simulates the real Cubicler orchestrator for integration testing
 */

export class MockCubiclerServer {
  private app: express.Application;
  private server: Server | null = null;
  private port: number;

  constructor(port: number = 1503) {
    this.port = port;
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        services: {
          cubicler: 'running',
          providers: 'connected'
        }
      });
    });

    // Get provider specification
    this.app.get('/provider/:providerName/spec', (req, res) => {
      const { providerName } = req.params;
      
      try {
        const spec = this.getProviderSpec(providerName);
        res.json(spec);
      } catch (error) {
        res.status(404).json({
          error: `Provider "${providerName}" not found`,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Execute function through provider
    this.app.post('/execute/:functionName', (req, res) => {
      const { functionName } = req.params;
      const parameters = req.body;
      
      try {
        const result = this.executeFunction(functionName, parameters);
        res.json(result);
      } catch (error) {
        res.status(400).json({
          error: `Function "${functionName}" execution failed`,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // List available agents (for completeness)
    this.app.get('/agents', (req, res) => {
      res.json({
        availableAgents: [
          { name: 'test-agent', endpoint: 'localhost:3001/call' },
          { name: 'weather-agent', endpoint: 'localhost:3002/call' }
        ]
      });
    });
  }

  private getProviderSpec(providerName: string): ProviderSpecResponse {
    const specs: Record<string, ProviderSpecResponse> = {
      weather: {
        context: 'You have access to current weather data. Use the getWeather function to retrieve weather information for any city worldwide.',
        functions: [
          {
            name: 'getWeather',
            description: 'Get current weather conditions for a specific city',
            parameters: {
              type: 'object',
              properties: {
                city: {
                  type: 'string'
                },
                country: {
                  type: 'string'
                },
                unit: {
                  type: 'string'
                }
              },
              required: ['city']
            } as FunctionParameterSchema
          }
        ]
      },
      calculator: {
        context: 'You can perform mathematical calculations and unit conversions using the available calculator functions.',
        functions: [
          {
            name: 'calculate',
            description: 'Perform basic mathematical calculations',
            parameters: {
              type: 'object',
              properties: {
                expression: {
                  type: 'string'
                }
              },
              required: ['expression']
            } as FunctionParameterSchema
          },
          {
            name: 'convertUnits',
            description: 'Convert between different units of measurement',
            parameters: {
              type: 'object',
              properties: {
                value: {
                  type: 'number'
                },
                fromUnit: {
                  type: 'string'
                },
                toUnit: {
                  type: 'string'
                }
              },
              required: ['value', 'fromUnit', 'toUnit']
            } as FunctionParameterSchema
          }
        ]
      },
      userdata: {
        context: 'You can access user information and perform user management operations.',
        functions: [
          {
            name: 'getUserById',
            description: 'Retrieve user information by user ID',
            parameters: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string'
                }
              },
              required: ['userId']
            } as FunctionParameterSchema
          },
          {
            name: 'searchUsers',
            description: 'Search for users by various criteria',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string'
                },
                limit: {
                  type: 'number'
                }
              },
              required: ['query']
            } as FunctionParameterSchema
          }
        ]
      }
    };

    if (!specs[providerName]) {
      throw new Error(`Provider "${providerName}" not found`);
    }

    return specs[providerName];
  }

  private executeFunction(functionName: string, parameters: JSONObject): MockFunctionResult {
    const functions: Record<string, (params: JSONObject) => MockFunctionResult> = {
      getWeather: (params) => {
        const { city, country, unit = 'celsius' } = params;
        
        // Mock weather data
        const weatherDatabase: Record<string, WeatherData> = {
          'new york': { temp: 22, condition: 'sunny', humidity: 65, wind: '10 mph' },
          'london': { temp: 15, condition: 'cloudy', humidity: 80, wind: '5 mph' },
          'tokyo': { temp: 28, condition: 'partly cloudy', humidity: 70, wind: '8 mph' },
          'paris': { temp: 18, condition: 'rainy', humidity: 75, wind: '7 mph' },
          'sydney': { temp: 25, condition: 'clear', humidity: 60, wind: '12 mph' }
        };

        const cityKey = (city as string).toLowerCase();
        const data = weatherDatabase[cityKey];
        
        if (!data) {
          throw new Error(`Weather data not available for ${cityKey}`);
        }

        let temperature = data.temp;
        if (unit === 'fahrenheit') {
          temperature = Math.round((temperature * 9/5) + 32);
        }

        return {
          city,
          country: country || null,
          temperature: `${temperature}°${unit === 'celsius' ? 'C' : 'F'}`,
          condition: data.condition,
          humidity: `${data.humidity}%`,
          wind: data.wind,
          timestamp: new Date().toISOString(),
          source: 'mock-weather-api'
        };
      },

      calculate: (params) => {
        const { expression } = params;
        
        try {
          // Simple and safe expression evaluator for testing
          const sanitized = (expression as string).replace(/[^0-9+\-*/().\s]/g, '');
          if (sanitized !== expression) {
            throw new Error('Invalid characters in expression');
          }
          
          // Simple calculator for basic math operations
          let result: number;
          try {
            // Use a simple eval alternative for test purposes
            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            result = Function(`"use strict"; return (${sanitized})`)();
          } catch {
            throw new Error('Failed to evaluate expression');
          }
          
          if (typeof result !== 'number' || !isFinite(result)) {
            throw new Error('Invalid mathematical expression result');
          }

          return {
            expression,
            result,
            type: 'calculation',
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          throw new Error(`Calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      },

      convertUnits: (params) => {
        const { value, fromUnit, toUnit } = params;
        
        const conversions: Record<string, Record<string, number>> = {
          // Length
          'miles': { 'km': 1.609344, 'meters': 1609.344, 'feet': 5280 },
          'km': { 'miles': 0.621371, 'meters': 1000, 'feet': 3280.84 },
          'meters': { 'km': 0.001, 'miles': 0.000621371, 'feet': 3.28084 },
          'feet': { 'meters': 0.3048, 'km': 0.0003048, 'miles': 0.000189394 },
          
          // Weight
          'kg': { 'pounds': 2.20462, 'ounces': 35.274, 'grams': 1000 },
          'pounds': { 'kg': 0.453592, 'ounces': 16, 'grams': 453.592 },
          'grams': { 'kg': 0.001, 'pounds': 0.00220462, 'ounces': 0.035274 }
        };

        const from = (fromUnit as string).toLowerCase();
        const to = (toUnit as string).toLowerCase();

        // Special case for temperature
        if (from === 'fahrenheit' && to === 'celsius') {
          const result = ((value as number) - 32) * 5/9;
          return { 
            value, 
            fromUnit, 
            toUnit, 
            result: Math.round(result * 100) / 100,
            type: 'temperature_conversion'
          };
        }
        if (from === 'celsius' && to === 'fahrenheit') {
          const result = ((value as number) * 9/5) + 32;
          return { 
            value, 
            fromUnit, 
            toUnit, 
            result: Math.round(result * 100) / 100,
            type: 'temperature_conversion'
          };
        }

        if (!conversions[from] || !conversions[from][to]) {
          throw new Error(`Conversion from ${from} to ${to} is not supported`);
        }

        const result = (value as number) * conversions[from][to];
        return {
          value,
          fromUnit,
          toUnit,
          result: Math.round(result * 100) / 100,
          type: 'unit_conversion'
        };
      },

      getUserById: (params) => {
        const { userId } = params;
        
        const users: Record<string, UserData> = {
          '123': { id: '123', name: 'John Doe', email: 'john@example.com', role: 'admin' },
          '456': { id: '456', name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
          '789': { id: '789', name: 'Bob Johnson', email: 'bob@example.com', role: 'user' }
        };

        const userIdString = userId as string;
        const user = users[userIdString];
        if (!user) {
          throw new Error(`User with ID ${userIdString} not found`);
        }

        return user;
      },

      searchUsers: (params) => {
        const { query, limit = 10 } = params;
        
        const allUsers = [
          { id: '123', name: 'John Doe', email: 'john@example.com', role: 'admin' },
          { id: '456', name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
          { id: '789', name: 'Bob Johnson', email: 'bob@example.com', role: 'user' },
          { id: '101', name: 'Alice Brown', email: 'alice@example.com', role: 'manager' }
        ];

        const searchTerm = (query as string).toLowerCase();
        const filtered = allUsers.filter(user => 
          user.name.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          user.role.toLowerCase().includes(searchTerm)
        );

        return {
          query,
          results: filtered.slice(0, limit as number),
          total: filtered.length,
          limit
        };
      }
    };

    if (!functions[functionName]) {
      throw new Error(`Function "${functionName}" not implemented`);
    }

    return functions[functionName](parameters);
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`🏢 Mock Cubicler server running on port ${this.port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🔴 Mock Cubicler server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getPort(): number {
    return this.port;
  }

  getUrl(): string {
    return `http://localhost:${this.port}`;
  }
}

// Default providers list for integration tests
export const mockProviders: ProviderInfo[] = [
  {
    name: 'weather',
    description: 'Provides current weather information for any location worldwide'
  },
  {
    name: 'calculator', 
    description: 'Performs mathematical calculations and unit conversions'
  },
  {
    name: 'userdata',
    description: 'Manages user information and search operations'
  }
];
