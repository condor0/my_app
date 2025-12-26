# Day 02: Validation, Exception Handling, and Swagger

## Build Steps Completed
- **ValidationPipe**: Configured global pipe with `whitelist`, `forbidNonWhitelisted`, and `transform` enabled.
- **Global Exception Filter**: Standardized all error responses to follow a consistent JSON structure.
- **Swagger Integration**: Initialized OpenAPI documentation at the `/api` route.
- **Testing Endpoint**: Added `POST /health/test` to verify payload validation.

## Standard Error Response Shape
All error responses from the API now follow this format:
```json
{
  "statusCode": 400,
  "timestamp": "2025-12-26T12:00:00.000Z",
  "path": "/requested-endpoint",
  "message": ["Detailed error message(s)"]
}