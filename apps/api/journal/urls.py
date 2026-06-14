from django.urls import path

from journal.views import JournalEntryDetailView, JournalEntryListCreateView

urlpatterns = [
    path("entries/", JournalEntryListCreateView.as_view(), name="journal-entries"),
    path("entries/<int:pk>/", JournalEntryDetailView.as_view(), name="journal-entry-detail"),
]
