import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const messages = [];

createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.url !== '/emails') {
    response.writeHead(404).end();
    return;
  }
  if (request.method === 'GET') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(messages));
    return;
  }
  if (request.method !== 'POST' || request.headers['content-type'] !== 'application/json') {
    response.writeHead(405).end();
    return;
  }

  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 2_000_000) {
      response.writeHead(413).end();
      return;
    }
  }

  try {
    const email = JSON.parse(body);
    const id = randomUUID();
    messages.push({ id, ...email });
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ id }));
  } catch {
    response.writeHead(400).end();
  }
}).listen(5174, '127.0.0.1', () => {
  console.log('Local inbox at http://127.0.0.1:5174/emails');
});
