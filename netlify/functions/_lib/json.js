export function json(statusCode, payload) {
  return {
    statusCode: statusCode || 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}
