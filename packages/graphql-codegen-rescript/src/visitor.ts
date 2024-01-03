import {
  Kind,
  type ScalarTypeDefinitionNode,
  type GraphQLSchema,
  type EnumTypeDefinitionNode,
  type InterfaceTypeDefinitionNode,
  type TypeNode,
  type UnionTypeDefinitionNode,
  type ObjectTypeDefinitionNode,
} from 'graphql';
import {
  buildScalarsFromConfig,
  indentMultiline,
  BaseVisitor,
  DEFAULT_SCALARS,
  type ParsedConfig,
  type RawConfig,
} from '@graphql-codegen/visitor-plugin-common';

import { type PluginConfig } from './config.ts';

export class ReScriptTypesVisitor extends BaseVisitor<RawConfig, ParsedConfig & ParsedConfig> {
  #definitionBegan = false;

  constructor(
    schema: GraphQLSchema,
    rawConfig: RawConfig,
    additionalConfig: Partial<PluginConfig> = {},
  ) {
    const config = {
      defaultScalarType: 'unknown',
      ...rawConfig,
    };
    super(config, {
      scalars: buildScalarsFromConfig(schema, config, DEFAULT_SCALARS),
      ...additionalConfig,
    });
  }

  get #typeKeyword(): string {
    if (this.#definitionBegan) {
      return `and`;
    } else {
      this.#definitionBegan = true;
      return 'type rec';
    }
  }

  get #unknownType(): string {
    return 'type unknown\n';
  }

  get #builtIns(): Record<string, string> {
    return {
      'ID': 'id',
      'String': 'string',
      'Int': 'int',
      'Float': 'float',
      'Boolean': 'bool',
    };
  }

  #getTypeName(node: TypeNode): string {
    const getTypeName = (node: TypeNode) => {
      switch (node.kind) {
        case Kind.NAMED_TYPE:
          return this.#builtIns[node.name.value] ?? `\\"${node.name.value}"`;
        case Kind.LIST_TYPE:
          return `array<${this.#getTypeName(node.type)}>`;
        default:
          throw new Error('invariant');
      }
    }
    switch (node.kind) {
      case Kind.NON_NULL_TYPE:
        return getTypeName(node.type);
      default:
        return `option<${getTypeName(node)}>`;
    }
  }

  getCommonDefinitions(): string[] {
    return [
      this.#unknownType,
    ];
  }

  [Kind.SCALAR_TYPE_DEFINITION](node: ScalarTypeDefinitionNode): string {
    const typeName = node.name.value;
    const binding = this.scalars[typeName]?.input;
    if (binding) {
      return `${this.#typeKeyword} \\"${typeName}" = ${binding}`;
    } else {
      return `${this.#typeKeyword} \\"${typeName}"`;
    }
  };

  [Kind.ENUM_TYPE_DEFINITION](node: EnumTypeDefinitionNode): string {
    const typeName = node.name.value;
    const values = node.values?.map(node => `| ${node.name.value}`) ?? [];
    if (values.length) {
      return `${this.#typeKeyword} \\"${typeName}" =\n` + indentMultiline(values.join('\n'));
    } else {
      return `${this.#typeKeyword} \\"${typeName}"`;
    }
  }

  [Kind.INTERFACE_TYPE_DEFINITION](node: InterfaceTypeDefinitionNode): string {
    const typeName = node.name.value;
    const fieldNodes = node.fields ?? [];

    const fieldTypes = fieldNodes.map(node => `${this.#typeKeyword} \\"${typeName}.${node.name.value}" = ${this.#getTypeName(node.type)}`);
    const fields = fieldNodes.map(node => `${node.name.value}: \\"${typeName}.${node.name.value}",`) ?? [];

    if (fields.length) {
      return [
        ...fieldTypes,
        `${this.#typeKeyword} \\"${typeName}" = {`,
        indentMultiline(fields.join('\n')),
        '}',
      ].join('\n');
    } else {
      return `${this.#typeKeyword} \\"${typeName}"`;
    }
  }

  [Kind.OBJECT_TYPE_DEFINITION](node: ObjectTypeDefinitionNode): string {
    const typeName = node.name.value;
    const fieldNodes = node.fields ?? [];

    if (fieldNodes.length) {
      const fieldTypes = fieldNodes.map(node => `${this.#typeKeyword} \\"${typeName}.${node.name.value}" = ${this.#getTypeName(node.type)}`);
      const fields = fieldNodes.map(node => `${node.name.value}: \\"${typeName}.${node.name.value}",`) ?? [];
      return [
        ...fieldTypes,
        `${this.#typeKeyword} \\"${typeName}" = {`,
        indentMultiline(fields.join('\n')),
        '}',
      ].join('\n');
    } else {
      return `${this.#typeKeyword} \\"${typeName}"`;
    }
  }

  [Kind.UNION_TYPE_DEFINITION](node: UnionTypeDefinitionNode): string {
    const typeName = node.name.value;
    const typeNodes = node.types ?? [];

    if (typeNodes.length) {
      const types = typeNodes.map(node => `| ${node.name.value}(\\"${node.name.value}")`) ?? [];
      return [
        '@tag("__typename")',
        `${this.#typeKeyword} \\"${typeName}" =`,
        indentMultiline(types.join('\n')),
      ].join('\n');
    } else {
      return `${this.#typeKeyword} \\"${typeName}"`;
    }
  }
}
