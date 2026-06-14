from django.urls import path

from journal.views import JournalEntryListCreateView

urlpatterns = [
    path("entries/", JournalEntryListCreateView.as_view(), name="journal-entries"),
]
