import { OpenAPIObject } from '@nestjs/swagger';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolWithMetadata } from '../types/mcp-types';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
type OperationObject = any;
type ParameterObject = any;
type SchemaObject = any;

function paramsToJsonSchema(params: ParameterObject[]): any {
  const properties: any = {};
  const required: string[] = [];

  for (const param of params) {
    // Determinar o tipo do parâmetro
    let paramType = 'string'; // padrão
    if (param.schema) {
      // Se o schema define o tipo, usar ele
      paramType = param.schema.type || 'string';
    } else if (param.type) {
      // Fallback para type direto
      paramType = param.type;
    }

    const property: any = {
      type: paramType,
      description: param.description || `${param.in} parameter: ${param.name}`,
    };

    // Adicionar constraints se existirem
    if (param.schema) {
      if (param.schema.minimum !== undefined) {
        property.minimum = param.schema.minimum;
      }
      if (param.schema.maximum !== undefined) {
        property.maximum = param.schema.maximum;
      }
      if (param.schema.enum) {
        property.enum = param.schema.enum;
      }
      if (param.schema.example !== undefined) {
        property.example = param.schema.example;
      }
    }

    if (param.in === 'path') {
      properties[param.name] = property;
      required.push(param.name);
    } else if (param.in === 'query') {
      properties[param.name] = property;
      if (param.required) {
        required.push(param.name);
      }
    }
  }

  return {
    type: 'object',
    properties,
    required,
  };
}

function requestBodyToJsonSchema(requestBody: any): any {
  if (!requestBody?.content) {
    return { type: 'object', properties: {} };
  }

  const content = requestBody.content;
  const jsonContent = content['application/json'];
  
  if (!jsonContent?.schema) {
    return { type: 'object', properties: {} };
  }

  return jsonContent.schema;
}

function pathParamsToSchema(path: string): any {
  const pathParams = path.match(/\{([^}]+)\}/g);
  if (!pathParams) {
    return { type: 'object', properties: {} };
  }

  const properties: any = {};
  const required: string[] = [];

  for (const param of pathParams) {
    const paramName = param.slice(1, -1); // Remove { }
    properties[paramName] = {
      type: 'string',
      description: `Path parameter: ${paramName}`,
    };
    required.push(paramName);
  }

  return {
    type: 'object',
    properties,
    required,
  };
}

export function openapiToMcpTools(document: OpenAPIObject, baseUrl: string): ToolWithMetadata[] {
  const tools: ToolWithMetadata[] = [];

  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
        continue;
      }

      const op = operation as OperationObject;
      const mcpExtension = op['x-mcp'] as any;

      // Só incluir operações marcadas com x-mcp.enabled = true
      if (!mcpExtension?.enabled) {
        continue;
      }

      // Construir schema de entrada
      const pathSchema = pathParamsToSchema(path);
      const paramSchema = paramsToJsonSchema(op.parameters || []);
      const bodySchema = requestBodyToJsonSchema(op.requestBody);

      // Combinar properties, dando prioridade ao pathSchema (path params têm precedência)
      const combinedProperties = {
        ...paramSchema.properties,
        ...pathSchema.properties, // Path params sobrescrevem query params com mesmo nome
        ...(method !== 'get' ? bodySchema.properties : {}),
      };

      // Combinar required, removendo duplicatas
      const requiredSet = new Set<string>();
      (pathSchema.required || []).forEach((r: string) => requiredSet.add(r));
      (paramSchema.required || []).forEach((r: string) => requiredSet.add(r));
      if (method !== 'get' && bodySchema.required) {
        bodySchema.required.forEach((r: string) => requiredSet.add(r));
      }

      const inputSchema = {
        type: 'object',
        properties: combinedProperties,
        required: Array.from(requiredSet),
      };

      tools.push({
        name: mcpExtension.toolName,
        description: mcpExtension.description || op.summary || op.description || '',
        inputSchema,
        httpMethod: method.toUpperCase(),
        httpPath: path,
        baseUrl,
      });
    }
  }

  return tools;
}
