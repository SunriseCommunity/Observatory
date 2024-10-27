export function mockUser() {
  const ip = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 256)
  ).join(".");

  return {
    user: {
      ip,
    },
    headers: {
      "X-Real-IP": ip,
    },
  };
}
