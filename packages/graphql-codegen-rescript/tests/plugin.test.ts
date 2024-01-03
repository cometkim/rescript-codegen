import { describe, test, expect } from 'vitest';
import { buildSchema } from 'graphql';
import { codegen } from '@graphql-codegen/core';

import * as plugin from 'graphql-codegen-rescript';

const gql = String.raw;

describe('graphql-codegen-rescript', () => {
  async function executePlugin(source: string, config?: plugin.PluginConfig) {
    const schemaAst = buildSchema(source);
    const result = await codegen({
      schema: null as any,
      schemaAst,
      filename: '',
      documents: [],
      plugins: [
        {
          rescript: config ?? {},
        },
      ],
      pluginMap: {
        rescript: plugin,
      },
      config: {
      },
    });
    return result;
  }

  test('success', async () => {
    const result = await executePlugin(gql`
      scalar Date

      schema {
        query: Query
      }

      type Query {
        me: User!
        user(id: ID!): User
        allUsers: [User]
        search(term: String!): [SearchResult!]!
        myChats: [Chat!]!
      }

      enum Role {
        USER
        ADMIN
      }

      interface Node {
        id: ID!
      }

      union SearchResult = User | Chat | ChatMessage

      type User implements Node {
        id: ID!
        username: String!
        email: String!
        role: Role!
      }

      type Chat implements Node {
        id: ID!
        users: [User!]!
        messages: [ChatMessage!]!
      }

      type ChatMessage implements Node {
        id: ID!
        content: String!
        time: Date!
        user: User!
      }
    `);

    expect(result).toMatchSnapshot();
  });
});
