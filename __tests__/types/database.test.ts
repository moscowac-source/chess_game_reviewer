/**
 * @jest-environment node
 */

// TypeScript field correctness is validated by tsc --noEmit.
// This test verifies the module is importable at runtime.
import * as db from '@/types/database'

test('types/database module is importable and exports type names', () => {
  // The module only exports TypeScript types (erased at runtime).
  // A successful import without error confirms the module resolves correctly.
  expect(db).toBeDefined()
})
