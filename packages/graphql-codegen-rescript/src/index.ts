import { visit } from 'graphql';
import { indentMultiline } from '@graphql-codegen/visitor-plugin-common';
import { getCachedDocumentNodeFromSchema, type PluginFunction } from '@graphql-codegen/plugin-helpers';

import { type PluginConfig } from './config.ts';
import { ReScriptTypesVisitor } from './visitor.ts';

export { PluginConfig };

export const plugin: PluginFunction<PluginConfig> = (schema, _documents) => {
  const visitor = new ReScriptTypesVisitor(schema, {}, {});

  const ast = getCachedDocumentNodeFromSchema(schema);
  const result = visit(ast, visitor);
  const fragments = result.definitions
    .filter((d: any) => typeof d === 'string') as unknown as string[];

  const generated = fragments.join('\n\n');

  return {
    prepend: [
      'module Types = {',
      indentMultiline(
        visitor.getCommonDefinitions().join('\n'),
      ),
    ],
    content: indentMultiline(generated),
    append: ['}'],
  };
};
