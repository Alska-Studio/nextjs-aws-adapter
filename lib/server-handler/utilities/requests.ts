import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import http from 'http';
import { format } from 'url';

export function APIGatewayProxyEventV2ToAppRequest(event: APIGatewayProxyEventV2) {
  return new IncomingMessage({
    method: event.requestContext.http.method,
    headers: requestHeaders(event) as Record<string, string>,
    url: format({
      pathname: event.rawPath,
      search: event.rawQueryString
    }),
    remoteAddress: event.requestContext.http.sourceIp,
    body: requestBody(event)
  });
}

function requestHeaders(event: APIGatewayProxyEventV2) {
  return Object.keys(event.headers).reduce<Record<string, string>>(
    (headers, key) => {
      headers[key.toLowerCase()] = event.headers[key as keyof typeof event.headers]!;
      return headers;
    },
    Array.isArray(event.cookies) ? { cookie: event.cookies.join('; ') } : {}
  );
}

function requestBody(event: APIGatewayProxyEventV2) {
  const type = typeof event.body;
  if (Buffer.isBuffer(event.body)) {
    return event.body;
  } else if (type === 'string') {
    return Buffer.from(event.body!, event.isBase64Encoded ? 'base64' : 'utf8');
  } else if (type === 'object') {
    return Buffer.from(JSON.stringify(event.body));
  } else {
    return Buffer.from('', 'utf8');
  }
}

// Copied and modified from serverless-http by Doug Moscrop
// https://github.com/dougmoscrop/serverless-http/blob/master/lib/request.js
// Licensed under the MIT License
export class IncomingMessage extends http.IncomingMessage {
  constructor({
    method,
    url,
    headers,
    body,
    remoteAddress
  }: {
    method: string;
    url: string;
    headers: Record<string, string | string[]>;
    body?: Buffer;
    remoteAddress?: string;
  }) {
    super({
      encrypted: true,
      readable: false,
      remoteAddress,
      address: () => ({ port: 443 }),
      end: Function.prototype,
      destroy: Function.prototype
    } as any);

    // Set the content length when there is a body.
    // See https://httpwg.org/specs/rfc9110.html#field.content-length
    if (body) {
      headers['content-length'] ??= String(Buffer.byteLength(body));
    }

    Object.assign(this, {
      ip: remoteAddress,
      complete: true,
      httpVersion: '1.1',
      httpVersionMajor: '1',
      httpVersionMinor: '1',
      method,
      headers,
      body,
      url
    });

    this._read = () => {
      this.push(body);
      this.push(null);
    };
  }
}