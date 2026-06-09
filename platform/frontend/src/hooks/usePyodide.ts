import { useState, useRef, useCallback } from 'react'

declare global { interface Window { loadPyodide: (opts: { indexURL: string }) => Promise<PyodideInstance> } }
interface PyodideInstance { runPython: (code: string) => unknown }

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/'

const TEST_RUNNER = `
import json, sys, re
from io import StringIO

def _run_tests(student_code, stub, test_cases_json):
    test_cases = json.loads(test_cases_json)
    match = re.search(r'def (\\w+)\\(', stub)
    if not match:
        return json.dumps([{"id": tc.get("id",i), "passed": False, "output": "Função não encontrada no stub"} for i, tc in enumerate(test_cases)])

    func_name = match.group(1)
    namespace = {}
    try:
        exec(student_code, namespace)
    except Exception as e:
        return json.dumps([{"id": tc.get("id",i), "passed": False, "output": f"Erro: {e}", "expected": ""} for i, tc in enumerate(test_cases)])

    if func_name not in namespace:
        return json.dumps([{"id": tc.get("id",i), "passed": False, "output": f"'{func_name}' não definida", "expected": ""} for i, tc in enumerate(test_cases)])

    func = namespace[func_name]
    results = []
    for tc in test_cases:
        try:
            args = json.loads(tc["input"])
            expected = json.loads(tc["expected"])
            old = sys.stdout; sys.stdout = StringIO()
            result = func(*args)
            out = sys.stdout.getvalue(); sys.stdout = old
            passed = result == expected
            output = repr(result)
            if out: output += f"  [print: {out.strip()}]"
            results.append({"id": tc.get("id"), "passed": passed, "output": output, "expected": repr(expected)})
        except Exception as e:
            results.append({"id": tc.get("id"), "passed": False, "output": str(e), "expected": ""})
    return json.dumps(results)
`

export interface TestResult { id: number | null; passed: boolean; output: string; expected: string }

export function usePyodide() {
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const pyRef = useRef<PyodideInstance | null>(null)

  const load = useCallback(async () => {
    if (pyRef.current) return
    setLoading(true)
    const script = document.createElement('script')
    script.src = `${PYODIDE_CDN}pyodide.js`
    document.head.appendChild(script)
    await new Promise<void>((res) => { script.onload = () => res() })
    const py = await window.loadPyodide({ indexURL: PYODIDE_CDN })
    py.runPython(TEST_RUNNER)
    pyRef.current = py
    setReady(true)
    setLoading(false)
  }, [])

  const runTests = useCallback(async (code: string, stub: string, testCases: object[]): Promise<TestResult[]> => {
    if (!pyRef.current) await load()
    const py = pyRef.current!
    const escaped = JSON.stringify(testCases)
    const result = py.runPython(`_run_tests(${JSON.stringify(code)}, ${JSON.stringify(stub)}, ${JSON.stringify(escaped)})`)
    return JSON.parse(result as string)
  }, [load])

  return { ready, loading, load, runTests }
}
