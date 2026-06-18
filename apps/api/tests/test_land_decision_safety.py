"""Tests for the Land Decision Safety module (Phase 2.12)."""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from journal.models import JournalEntry
from land.models import LandDocumentRecord, LandDueDiligenceItem, LandOpportunity
from privacy.models import DataGrant

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="lander", password="pw-12345")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(username="intruder", password="pw-12345")


@pytest.fixture
def client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def _create_opportunity(client, **overrides):
    payload = {
        "title": "2 acres in Kitengela",
        "location_text": "Kitengela, Kajiado",
        "asking_price": "1500000.00",
        "deposit_requested": "200000.00",
        "seller_type": "agent",
        "title_status": "title_not_seen",
        "intended_use": "speculation",
        "decision_stage": "before_deposit",
    }
    payload.update(overrides)
    return client.post("/api/land/opportunities/", payload, format="json")


def test_create_opportunity_and_default_checklist(client):
    response = _create_opportunity(client)
    assert response.status_code == 201
    opp_id = response.json()["id"]
    opp = LandOpportunity.objects.get(id=opp_id)
    assert opp.due_diligence_items.count() == 14  # default checklist seeded


def test_default_checklist_endpoint(db):
    response = APIClient().get("/api/land/default-checklist/")
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 14
    keys = {item["item_key"] for item in body["items"]}
    assert "official_search" in keys and "title_seen" in keys


def test_risk_score_high_when_nothing_done(client):
    opp_id = _create_opportunity(client).json()["id"]
    response = client.post(f"/api/land/opportunities/{opp_id}/risk-score/", {}, format="json")
    assert response.status_code == 200
    body = response.json()
    assert body["risk_level"] in ("high", "very_high")
    flag_types = {f["flag_type"] for f in body["risk_flags"]}
    assert "no_title_seen" in flag_types
    assert "no_search_done" in flag_types
    assert "deposit_pressure" in flag_types  # deposit requested before search


def test_risk_score_lower_when_diligence_done(client):
    opp_id = _create_opportunity(client, title_status="title_seen", deposit_requested=None).json()["id"]
    high = client.post(f"/api/land/opportunities/{opp_id}/risk-score/", {}, format="json").json()
    # Mark the critical items as done.
    done_keys = [
        "title_seen",
        "official_search",
        "search_matches_seller",
        "encumbrances",
        "advocate_review",
        "sale_agreement_reviewed",
        "boundaries_confirmed",
    ]
    for item in LandDueDiligenceItem.objects.filter(land_opportunity_id=opp_id, item_key__in=done_keys):
        client.patch(f"/api/land/checklist-items/{item.id}/", {"status": "verified_by_user"}, format="json")
    after = client.post(f"/api/land/opportunities/{opp_id}/risk-score/", {}, format="json").json()
    assert len(after["risk_flags"]) < len(high["risk_flags"])


def test_pressure_signal_adds_flag(client):
    opp_id = _create_opportunity(client, title_status="title_seen").json()["id"]
    body = client.post(
        f"/api/land/opportunities/{opp_id}/risk-score/",
        {"pressure_to_pay_quickly": True, "unrealistic_appreciation_claim": True},
        format="json",
    ).json()
    flag_types = {f["flag_type"] for f in body["risk_flags"]}
    assert "deposit_pressure" in flag_types
    assert "unrealistic_appreciation_claim" in flag_types


def test_risk_output_does_not_say_safe(client):
    opp_id = _create_opportunity(client, title_status="title_seen").json()["id"]
    body = client.post(f"/api/land/opportunities/{opp_id}/risk-score/", {}, format="json").json()
    assert "safe" not in body["summary"].lower()
    assert "visible risk" in body["summary"].lower()


def test_save_to_journal(client):
    opp_id = _create_opportunity(client).json()["id"]
    response = client.post(
        f"/api/land/opportunities/{opp_id}/save-to-journal/", {"note": "Waiting for search."}, format="json"
    )
    assert response.status_code == 201
    entry_id = response.json()["journal_entry_id"]
    entry = JournalEntry.objects.get(id=entry_id)
    assert entry.visibility == JournalEntry.Visibility.PRIVATE
    assert LandOpportunity.objects.get(id=opp_id).journal_links.filter(journal_entry=entry).exists()


def test_document_is_private_by_default(client):
    opp_id = _create_opportunity(client).json()["id"]
    response = client.post(
        f"/api/land/opportunities/{opp_id}/documents/",
        {"document_type": "sale_agreement", "notes": "draft"},
        format="json",
    )
    assert response.status_code == 201
    assert response.json()["visibility"] == "private"
    assert LandDocumentRecord.objects.get(id=response.json()["id"]).visibility == "private"


def test_request_review_defaults_to_limited_sharing(client):
    opp_id = _create_opportunity(client).json()["id"]
    # Upload a private document but do NOT share it.
    client.post(
        f"/api/land/opportunities/{opp_id}/documents/",
        {"document_type": "title_copy", "notes": "copy"},
        format="json",
    )
    response = client.post(
        f"/api/land/opportunities/{opp_id}/request-professional-review/",
        {"professional_type": "land_lawyer", "question": "Is this title genuine?"},
        format="json",
    )
    assert response.status_code == 201
    body = response.json()
    assert body["documents_shared_count"] == 0
    assert body["amount_shared"] is False
    assert body["access_expires_at"]  # auto-expiring access

    grant = DataGrant.objects.get(id=body["data_grant_id"])
    assert grant.scopes == [DataGrant.Scope.CONSULTATION_CONTEXT]  # documents NOT in scope
    assert grant.status == DataGrant.Status.ACTIVE
    # The document stays private since it was not selected for sharing.
    assert LandDocumentRecord.objects.filter(land_opportunity_id=opp_id, visibility="private").count() == 1


def test_request_review_shares_only_selected_documents(client):
    opp_id = _create_opportunity(client).json()["id"]
    doc_id = client.post(
        f"/api/land/opportunities/{opp_id}/documents/",
        {"document_type": "title_copy", "notes": "copy"},
        format="json",
    ).json()["id"]
    response = client.post(
        f"/api/land/opportunities/{opp_id}/request-professional-review/",
        {"professional_type": "surveyor", "share_document_ids": [doc_id], "share_amount": True},
        format="json",
    )
    body = response.json()
    assert body["documents_shared_count"] == 1
    assert body["amount_shared"] is True
    grant = DataGrant.objects.get(id=body["data_grant_id"])
    assert DataGrant.Scope.SELECTED_DOCUMENTS in grant.scopes
    assert LandDocumentRecord.objects.get(id=doc_id).visibility == "shared_with_professional"


def test_land_vs_alternatives_no_guaranteed_returns(db):
    response = APIClient().post(
        "/api/land/compare/",
        {"land_price": "1500000.00", "holding_period_years": 5, "appreciation_scenario": "neutral"},
        format="json",
    )
    assert response.status_code == 200
    body = response.json()
    assert "not guaranteed" in body["warning"].lower()
    assert body["land_scenario"]["liquidity"] == "low"
    assert len(body["alternatives"]) == 6
    # No claim of guaranteed returns anywhere in the land scenario.
    assert "guaranteed" not in body["land_scenario"]["note"].lower()


def test_cross_user_cannot_access_opportunity(client, other_user):
    opp_id = _create_opportunity(client).json()["id"]
    intruder = APIClient()
    intruder.force_authenticate(user=other_user)
    assert intruder.get(f"/api/land/opportunities/{opp_id}/").status_code == 404
    assert intruder.patch(f"/api/land/opportunities/{opp_id}/", {"title": "hacked"}, format="json").status_code == 404
    assert intruder.post(f"/api/land/opportunities/{opp_id}/risk-score/", {}, format="json").status_code == 404


def test_anonymous_cannot_create_opportunity(db):
    response = APIClient().post("/api/land/opportunities/", {"title": "x", "location_text": "y"}, format="json")
    assert response.status_code in (401, 403)
