/**
 * Health Check API
 * 
 * Test endpoint to verify routing is working
 */

export async function GET() {
  return Response.json({ 
    status: "ok",
    message: "API routing is working correctly",
    timestamp: new Date().toISOString()
  })
}

