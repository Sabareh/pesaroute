import pytest
from django.core.management import call_command

from catalog.models import ProductCategory, ProductPassport
from knowledge.models import DataSource, Regulator, SourceRecord
from learning.models import LearningLesson, LearningResource, LearningTrack


@pytest.mark.django_db
def test_seed_kenya_investment_knowledge_is_idempotent():
    call_command("seed_kenya_investment_knowledge")
    first_counts = {
        "sources": DataSource.objects.count(),
        "passports": ProductPassport.objects.count(),
        "tracks": LearningTrack.objects.count(),
        "lessons": LearningLesson.objects.count(),
        "resources": LearningResource.objects.count(),
        "records": SourceRecord.objects.count(),
    }

    call_command("seed_kenya_investment_knowledge")

    assert {
        "sources": DataSource.objects.count(),
        "passports": ProductPassport.objects.count(),
        "tracks": LearningTrack.objects.count(),
        "lessons": LearningLesson.objects.count(),
        "resources": LearningResource.objects.count(),
        "records": SourceRecord.objects.count(),
    } == first_counts


@pytest.mark.django_db
def test_seed_creates_kenyan_sources_categories_passports_and_learning():
    call_command("seed_kenya_investment_knowledge")

    assert Regulator.objects.filter(abbreviation="CMA").exists()
    assert DataSource.objects.filter(slug="cma-licensee-register", authority_level="official").exists()
    assert ProductCategory.objects.filter(slug="money-market-funds").exists()

    passport = ProductPassport.objects.get(slug="treasury-bill-via-dhowcsd")
    assert passport.source_references.filter(source__slug="cbk-government-securities").exists()
    assert passport.source_references.filter(source__slug="dhowcsd-portal").exists()
    assert passport.status == ProductPassport.Status.PUBLISHED

    track = LearningTrack.objects.get(slug="money-foundations")
    assert track.status == LearningTrack.Status.PUBLISHED
    assert LearningLesson.objects.filter(course__track=track, title="Emergency fund basics").exists()
    assert LearningResource.objects.filter(title="Glossary: liquidity").exists()
    assert SourceRecord.objects.filter(source_record_key__contains="scam-red-flag").count() >= 10


@pytest.mark.django_db
def test_public_apis_return_seeded_source_linked_content(client):
    call_command("seed_kenya_investment_knowledge")

    passport_response = client.get("/api/catalog/product-passports/?search=DhowCSD")
    assert passport_response.status_code == 200
    passport = passport_response.json()["results"][0]
    assert passport["slug"] == "treasury-bill-via-dhowcsd"
    assert passport["source_references"]
    assert "editorial_notes" not in passport

    learning_response = client.get("/api/learning/tracks/")
    assert learning_response.status_code == 200
    assert any(track["slug"] == "money-foundations" for track in learning_response.json()["results"])

    cma_source = DataSource.objects.get(slug="cma-licensee-register")
    source_response = client.get(f"/api/knowledge/sources/{cma_source.id}/")
    assert source_response.status_code == 200
    assert source_response.json()["slug"] == "cma-licensee-register"
