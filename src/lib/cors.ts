// lib/cors.ts
import { NextResponse } from 'next/server';

export interface CorsOptions {
  origin?: string | string[] | boolean;
  methods?: string | string[];
  allowedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
}

const defaultOptions: CorsOptions = {
  origin: true, // 允许所有来源
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'X-CSRF-Token',
    'X-Requested-With',
    'Accept',
    'Accept-Version',
    'Content-Length',
    'Content-MD5',
    'Content-Type',
    'Date',
    'X-Api-Version',
    'Authorization'
  ],
  credentials: false,
  maxAge: 86400
};

export function setCorsHeaders(
  response: NextResponse, 
  options: CorsOptions = {}
): NextResponse {
  const opts = { ...defaultOptions, ...options };

  // 设置 Access-Control-Allow-Origin
  if (opts.origin === true) {
    response.headers.set('Access-Control-Allow-Origin', '*');
  } else if (typeof opts.origin === 'string') {
    response.headers.set('Access-Control-Allow-Origin', opts.origin);
  } else if (Array.isArray(opts.origin)) {
    response.headers.set('Access-Control-Allow-Origin', opts.origin.join(', '));
  }

  // 设置 Access-Control-Allow-Methods
  if (opts.methods) {
    const methods = Array.isArray(opts.methods) ? opts.methods.join(', ') : opts.methods;
    response.headers.set('Access-Control-Allow-Methods', methods);
  }

  // 设置 Access-Control-Allow-Headers
  if (opts.allowedHeaders) {
    const headers = Array.isArray(opts.allowedHeaders) 
      ? opts.allowedHeaders.join(', ') 
      : opts.allowedHeaders;
    response.headers.set('Access-Control-Allow-Headers', headers);
  }

  // 设置 Access-Control-Allow-Credentials
  if (opts.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // 设置 Access-Control-Max-Age
  if (opts.maxAge) {
    response.headers.set('Access-Control-Max-Age', opts.maxAge.toString());
  }

  return response;
}

export function createCorsResponse(status: number = 200, options: CorsOptions = {}): NextResponse {
  const response = new NextResponse(null, { status });
  return setCorsHeaders(response, options);
}

// 专门处理 OPTIONS 请求的函数
export function handleOptionsRequest(options: CorsOptions = {}): NextResponse {
  return createCorsResponse(200, options);
}
