"""VPN Service — stub for future WireGuard integration.

This module provides the interface for VPN functionality.
Currently all methods are stubs that log calls.
When integrating a real VPN (WireGuard), replace the implementation
without changing the interface.

Architecture notes for diploma:
- Protocol: WireGuard (fast, modern, minimal attack surface)
- Integration points: encrypt traffic between Electron client and backend
- Key exchange: during authentication, server provides WireGuard config
- Tunnel: all API traffic goes through encrypted tunnel
"""

import logging
from typing import Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class VPNStatus(BaseModel):
    connected: bool = False
    protocol: str = "wireguard"
    server_address: Optional[str] = None
    latency_ms: Optional[int] = None


class VPNService:
    """VPN service interface — stub implementation."""

    def __init__(self):
        self._connected = False
        self._server = None
        logger.info("VPN Service initialized (stub mode)")

    async def connect(self, server_address: str = "vpn.interview-platform.local") -> VPNStatus:
        """Connect to VPN server. [STUB]"""
        logger.info(f"[VPN STUB] connect() called with server={server_address}")
        self._connected = True
        self._server = server_address
        return VPNStatus(connected=True, server_address=server_address, latency_ms=15)

    async def disconnect(self) -> VPNStatus:
        """Disconnect from VPN. [STUB]"""
        logger.info("[VPN STUB] disconnect() called")
        self._connected = False
        self._server = None
        return VPNStatus(connected=False)

    async def get_status(self) -> VPNStatus:
        """Get current VPN status. [STUB]"""
        logger.info("[VPN STUB] get_status() called")
        return VPNStatus(
            connected=self._connected,
            server_address=self._server,
            latency_ms=15 if self._connected else None,
        )

    async def encrypt_payload(self, data: bytes) -> bytes:
        """Encrypt payload for transmission. [STUB]"""
        logger.info(f"[VPN STUB] encrypt_payload() called, {len(data)} bytes")
        return data  # Pass-through in stub mode

    async def decrypt_payload(self, data: bytes) -> bytes:
        """Decrypt received payload. [STUB]"""
        logger.info(f"[VPN STUB] decrypt_payload() called, {len(data)} bytes")
        return data  # Pass-through in stub mode


vpn_service = VPNService()
