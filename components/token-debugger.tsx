"use client"

import { useEffect, useState } from "react"
import { authAPI, api } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"

/**
 * Debug component to test token validation
 * Add this to any page to test the auth endpoints
 */
export function TokenDebugger() {
  const { isAuthenticated, user } = useAuth()
  const [testResults, setTestResults] = useState<Record<string, any>>({})
  const [testing, setTesting] = useState(false)

  const testEndpoint = async (name: string, testFn: () => Promise<any>) => {
    try {
      console.log(`Testing ${name}...`)
      const result = await testFn()
      console.log(`${name} success:`, result)
      setTestResults((prev: Record<string, any>) => ({
        ...prev,
        [name]: { success: true, data: result }
      }))
    } catch (error: any) {
      console.log(`${name} failed:`, error.response?.status, error.response?.data)
      setTestResults((prev: Record<string, any>) => ({
        ...prev,
        [name]: { 
          success: false, 
          status: error.response?.status,
          data: error.response?.data 
        }
      }))
    }
  }

  const runAllTests = async () => {
    setTesting(true)
    setTestResults({})

    // Test all endpoints
    await testEndpoint("auth/me", () => authAPI.me())
    await testEndpoint("projects/my", () => api.get("/projects/my"))
    await testEndpoint("users", () => api.get("/users"))

    setTesting(false)
  }

  if (!isAuthenticated) {
    return (
      <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 rounded">
        <p>Not authenticated - Cannot test token validation</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 border rounded space-y-4">
      <div>
        <h3 className="font-bold">Token Debug Info</h3>
        <p>User: {user?.username} ({user?.role})</p>
        <p>Auth Status: {isAuthenticated ? "✅ Authenticated" : "❌ Not Authenticated"}</p>
      </div>

      <button
        onClick={runAllTests}
        disabled={testing}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
      >
        {testing ? "Testing..." : "Test Token Validation"}
      </button>

      {Object.keys(testResults).length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold">Test Results:</h4>
          {Object.entries(testResults).map(([endpoint, result]: [string, any]) => (
            <div key={endpoint} className="p-2 border rounded">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{endpoint}</span>
                {result.success ? (
                  <span className="text-green-600">✅ Success</span>
                ) : (
                  <span className="text-red-600">❌ Failed ({result.status})</span>
                )}
              </div>
              <pre className="text-xs mt-1 bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}