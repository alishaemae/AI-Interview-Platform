"""Tests for core platform functionality."""

import pytest
import asyncio
from app.auth.jwt_utils import hash_password, verify_password, create_access_token, decode_token
from app.code_executor.executor import CodeExecutor


# ── Auth Tests ───────────────────────────────────────────────────────────────

class TestAuth:
    def test_hash_password(self):
        hashed = hash_password("TestPass123!")
        assert hashed != "TestPass123!"
        assert hashed.startswith("$2b$")

    def test_verify_password(self):
        hashed = hash_password("TestPass123!")
        assert verify_password("TestPass123!", hashed) is True
        assert verify_password("WrongPass", hashed) is False

    def test_create_and_decode_token(self):
        token = create_access_token({"user_id": 1, "role": "candidate"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["user_id"] == 1
        assert payload["role"] == "candidate"

    def test_invalid_token(self):
        payload = decode_token("invalid.token.here")
        assert payload is None


# ── Code Executor Tests ──────────────────────────────────────────────────────

class TestCodeExecutor:
    executor = CodeExecutor()

    @pytest.mark.asyncio
    async def test_python_simple(self):
        code = "n = int(input())\narr = list(map(int, input().split()))\nprint(sum(arr))"
        result = await self.executor.run_tests(
            code, "python",
            [{"input": "3\n1 2 3", "expected": "6"}]
        )
        assert result["passed"] == 1
        assert result["total"] == 1

    @pytest.mark.asyncio
    async def test_python_multiple_tests(self):
        code = "print(input()[::-1])"
        result = await self.executor.run_tests(
            code, "python",
            [
                {"input": "abc", "expected": "cba"},
                {"input": "hello", "expected": "olleh"},
                {"input": "a", "expected": "a"},
            ]
        )
        assert result["passed"] == 3

    @pytest.mark.asyncio
    async def test_python_error(self):
        code = "print(1/0)"
        result = await self.executor.run_tests(
            code, "python",
            [{"input": "", "expected": "0"}]
        )
        assert result["passed"] == 0

    @pytest.mark.asyncio
    async def test_unsupported_language(self):
        result = await self.executor.run_tests(
            "code", "rust",
            [{"input": "", "expected": ""}]
        )
        assert "error" in result
        assert result["passed"] == 0


# ── Role-based Access Tests ──────────────────────────────────────────────────

class TestRoles:
    def test_token_contains_role(self):
        token = create_access_token({"user_id": 1, "role": "hr"})
        payload = decode_token(token)
        assert payload["role"] == "hr"

    def test_candidate_token(self):
        token = create_access_token({"user_id": 2, "role": "candidate"})
        payload = decode_token(token)
        assert payload["role"] == "candidate"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
