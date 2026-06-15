from __future__ import annotations

import base64
import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

from django.conf import settings
from django.utils import timezone


class MpesaError(RuntimeError):
    pass


@dataclass(frozen=True)
class MpesaCheckoutResponse:
    checkout_request_id: str
    merchant_request_id: str
    response_code: str
    response_description: str


def normalize_phone_number(phone_number: str) -> str:
    digits = "".join(character for character in phone_number if character.isdigit())
    if digits.startswith("0") and len(digits) == 10:
        return f"254{digits[1:]}"
    if digits.startswith("7") and len(digits) == 9:
        return f"254{digits}"
    if digits.startswith("254") and len(digits) == 12:
        return digits
    raise MpesaError("Use a valid Kenyan M-Pesa phone number.")


def mask_phone_number(phone_number: str) -> str:
    normalized = normalize_phone_number(phone_number)
    return f"{normalized[:5]}***{normalized[-3:]}"


def mpesa_timestamp() -> str:
    return timezone.localtime().strftime("%Y%m%d%H%M%S")


def extract_callback_summary(payload: dict[str, Any]) -> dict[str, Any]:
    callback = payload.get("Body", {}).get("stkCallback", {})
    metadata_items = callback.get("CallbackMetadata", {}).get("Item", []) or []
    metadata = {item.get("Name"): item.get("Value") for item in metadata_items if item.get("Name")}
    return {
        "merchant_request_id": callback.get("MerchantRequestID", ""),
        "checkout_request_id": callback.get("CheckoutRequestID", ""),
        "result_code": callback.get("ResultCode"),
        "result_description": callback.get("ResultDesc", ""),
        "receipt": metadata.get("MpesaReceiptNumber", ""),
        "amount": metadata.get("Amount"),
    }


class MpesaAdapter:
    def __init__(self) -> None:
        self.mock_mode = settings.MPESA_MOCK_MODE
        self.base_url = settings.MPESA_BASE_URL
        self.consumer_key = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.business_shortcode = settings.MPESA_BUSINESS_SHORTCODE
        self.passkey = settings.MPESA_PASSKEY
        self.callback_url = settings.MPESA_CALLBACK_URL
        self.transaction_type = settings.MPESA_TRANSACTION_TYPE
        self.account_reference = settings.MPESA_ACCOUNT_REFERENCE

    def access_token(self) -> str:
        if self.mock_mode:
            return "mock-mpesa-access-token"
        if not self.consumer_key or not self.consumer_secret:
            raise MpesaError("M-Pesa consumer key and secret are not configured.")
        credentials = f"{self.consumer_key}:{self.consumer_secret}".encode()
        request = urllib.request.Request(
            f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials",
            headers={"Authorization": f"Basic {base64.b64encode(credentials).decode('ascii')}"},
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise MpesaError("Could not retrieve M-Pesa access token.") from exc
        token = payload.get("access_token")
        if not token:
            raise MpesaError("M-Pesa access token response was invalid.")
        return token

    def initiate_checkout(
        self,
        *,
        amount: int,
        phone_number: str,
        account_reference: str,
        transaction_description: str,
    ) -> MpesaCheckoutResponse:
        normalized_phone = normalize_phone_number(phone_number)
        if self.mock_mode:
            suffix = normalized_phone[-4:]
            timestamp = mpesa_timestamp()
            return MpesaCheckoutResponse(
                checkout_request_id=f"mock-checkout-{timestamp}-{suffix}",
                merchant_request_id=f"mock-merchant-{timestamp}-{suffix}",
                response_code="0",
                response_description="Mock M-Pesa STK push accepted.",
            )

        if not all([self.business_shortcode, self.passkey, self.callback_url]):
            raise MpesaError("M-Pesa shortcode, passkey, and callback URL must be configured.")

        timestamp = mpesa_timestamp()
        password = base64.b64encode(f"{self.business_shortcode}{self.passkey}{timestamp}".encode()).decode("ascii")
        payload = {
            "BusinessShortCode": self.business_shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": self.transaction_type,
            "Amount": int(amount),
            "PartyA": normalized_phone,
            "PartyB": self.business_shortcode,
            "PhoneNumber": normalized_phone,
            "CallBackURL": self.callback_url,
            "AccountReference": account_reference[:12],
            "TransactionDesc": transaction_description[:64],
        }
        request = urllib.request.Request(
            f"{self.base_url}/mpesa/stkpush/v1/processrequest",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.access_token()}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                response_payload = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise MpesaError("Could not initiate M-Pesa checkout.") from exc

        checkout_request_id = response_payload.get("CheckoutRequestID")
        merchant_request_id = response_payload.get("MerchantRequestID")
        if not checkout_request_id or not merchant_request_id:
            raise MpesaError("M-Pesa checkout initiation response was invalid.")
        return MpesaCheckoutResponse(
            checkout_request_id=checkout_request_id,
            merchant_request_id=merchant_request_id,
            response_code=str(response_payload.get("ResponseCode", "")),
            response_description=str(response_payload.get("ResponseDescription", "")),
        )
