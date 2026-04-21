import "@testing-library/jest-dom";

// next/headers cookies() can only run inside a request scope. Tests that
// exercise routes wrapped with withAuthedRoute may default to a session-bound
// Supabase client which calls cookies() — mock it to a no-op store so those
// tests can run outside a request scope when they inject their own db.
jest.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [],
    set: () => undefined,
  }),
}));
