import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../../src/validators/index.js';
import { ConversationSchema, MessageSchema } from '../../src/schemas/conversation.js';

const VECTORS_DIR = join(__dirname, '../../vectors/conversation');
function loadVectors(filename: string) {
  return JSON.parse(readFileSync(join(VECTORS_DIR, filename), 'utf8'));
}

describe('Conversation Golden Vectors', () => {
  const data = loadVectors('conversations.json');

  describe('valid conversations', () => {
    for (const v of data.valid_conversations as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(ConversationSchema, v.data);
        expect(result.valid).toBe(true);
      });
    }
  });

  describe('valid messages', () => {
    for (const v of data.valid_messages as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(MessageSchema, v.data);
        expect(result.valid).toBe(true);
      });
    }
  });

  describe('invalid data rejected', () => {
    it('rejects invalid conversation status', () => {
      const result = validate(ConversationSchema, {
        id: 'conv_test',
        nft_id: 'eip155:1/0x5Af0D9827E0c53E4799BB226655A1de152A425a5/42',
        status: 'deleted',
        message_count: 0,
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-01-15T10:00:00Z',
        contract_version: '2.0.0',
      });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid message role', () => {
      const result = validate(MessageSchema, {
        id: 'msg_test',
        conversation_id: 'conv_test',
        role: 'admin',
        content: 'test',
        created_at: '2026-01-15T10:00:00Z',
        contract_version: '2.0.0',
      });
      expect(result.valid).toBe(false);
    });
  });
});
