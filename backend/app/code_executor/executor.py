"""Code execution service — runs candidate code safely with test cases.

In production, this uses Docker containers with resource limits.
For development/demo, it uses subprocess with timeouts.
"""

import asyncio
import json
import tempfile
import os
import sys
import logging
import time
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class CodeExecutor:
    """Execute candidate code against test cases."""

    TIMEOUT_SECONDS = 10
    SUPPORTED_LANGUAGES = {"python", "javascript"}

    async def run_tests(
        self,
        code: str,
        language: str,
        test_cases: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """
        Run code against test cases and return results.
        Returns: {passed, total, results: [{input, expected, actual, passed, error}], execution_time_ms}
        """
        if language not in self.SUPPORTED_LANGUAGES:
            return {
                "passed": 0,
                "total": len(test_cases),
                "results": [],
                "execution_time_ms": 0,
                "error": f"Язык {language} не поддерживается. Доступны: {', '.join(self.SUPPORTED_LANGUAGES)}"
            }

        results = []
        total_passed = 0
        start_time = time.monotonic()

        for tc in test_cases:
            result = await self._run_single_test(code, language, tc["input"], tc["expected"])
            results.append(result)
            if result["passed"]:
                total_passed += 1

        execution_time_ms = int((time.monotonic() - start_time) * 1000)

        return {
            "passed": total_passed,
            "total": len(test_cases),
            "results": results,
            "execution_time_ms": execution_time_ms,
        }

    async def _run_single_test(
        self, code: str, language: str, test_input: str, expected: str
    ) -> Dict[str, Any]:
        """Run code with a single test input."""
        try:
            if language == "python":
                actual, error = await self._run_python(code, test_input)
            elif language == "javascript":
                actual, error = await self._run_javascript(code, test_input)
            else:
                return {"input": test_input, "expected": expected, "actual": "", "passed": False, "error": "Unsupported language"}

            if error:
                return {"input": test_input, "expected": expected, "actual": actual, "passed": False, "error": error}

            # Normalize: strip each line, remove trailing blank lines
            def _norm(s): return '\n'.join(l.rstrip() for l in s.strip().splitlines())
            norm_actual = _norm(actual)
            norm_expected = _norm(expected)
            passed = norm_actual == norm_expected
            # Fallback: try numeric comparison for single-value outputs
            if not passed:
                try:
                    a_vals = norm_actual.split()
                    e_vals = norm_expected.split()
                    if len(a_vals) == len(e_vals):
                        passed = all(abs(float(a) - float(e)) < 0.01 for a, e in zip(a_vals, e_vals))
                except (ValueError, ZeroDivisionError):
                    pass
            return {"input": test_input, "expected": expected, "actual": actual.strip(), "passed": passed, "error": None}

        except Exception as e:
            return {"input": test_input, "expected": expected, "actual": "", "passed": False, "error": str(e)}

    async def _run_python(self, code: str, test_input: str) -> tuple:
        """Run Python code with input via subprocess."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
            f.write(code)
            tmp_path = f.name

        try:
            proc = await asyncio.create_subprocess_exec(
                sys.executable, tmp_path,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(input=test_input.encode('utf-8')),
                timeout=self.TIMEOUT_SECONDS
            )
            stdout_str = stdout.decode('utf-8', errors='replace')
            stderr_str = stderr.decode('utf-8', errors='replace')

            if proc.returncode != 0:
                return stdout_str, stderr_str or f"Exit code: {proc.returncode}"
            return stdout_str, None

        except asyncio.TimeoutError:
            try:
                proc.kill()
            except:
                pass
            return "", f"Превышено время выполнения ({self.TIMEOUT_SECONDS}с)"
        finally:
            os.unlink(tmp_path)

    async def _run_javascript(self, code: str, test_input: str) -> tuple:
        """Run JavaScript code with input via Node.js subprocess."""
        # Wrap code to read from stdin
        wrapper = f"""
const readline = require('readline');
const rl = readline.createInterface({{ input: process.stdin }});
let lines = [];
rl.on('line', (line) => lines.push(line));
rl.on('close', () => {{
    const input = lines.join('\\n');
    // Make input available
    global.__input = input;
    global.__inputLines = lines;
    global.__lineIndex = 0;
    global.readLine = () => global.__inputLines[global.__lineIndex++] || '';
    {code}
}});
"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as f:
            f.write(wrapper)
            tmp_path = f.name

        try:
            proc = await asyncio.create_subprocess_exec(
                'node', tmp_path,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(input=test_input.encode('utf-8')),
                timeout=self.TIMEOUT_SECONDS
            )
            stdout_str = stdout.decode('utf-8', errors='replace')
            stderr_str = stderr.decode('utf-8', errors='replace')

            if proc.returncode != 0:
                return stdout_str, stderr_str or f"Exit code: {proc.returncode}"
            return stdout_str, None

        except asyncio.TimeoutError:
            try:
                proc.kill()
            except:
                pass
            return "", f"Превышено время выполнения ({self.TIMEOUT_SECONDS}с)"
        finally:
            os.unlink(tmp_path)


code_executor = CodeExecutor()
