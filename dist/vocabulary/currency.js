import { Type } from '@sinclair/typebox';
/** String-encoded micro-USD integer. 1 USD = 1,000,000 micro-USD. */
export const MicroUSD = Type.String({
    pattern: '^[0-9]+$',
    description: 'Micro-USD amount as string (1 USD = 1,000,000 micro-USD)',
});
//# sourceMappingURL=currency.js.map